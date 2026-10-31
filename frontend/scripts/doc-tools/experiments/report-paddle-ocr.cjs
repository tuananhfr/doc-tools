/* Usage: node report-paddle-ocr.cjs raw.json input.jpg [baseline.json reference.json] */
const fs = require('fs'), path = require('path'), assert = require('assert/strict');
const cv = require('@napi-rs/canvas'), ts = require('typescript'), { PDFDocument, rgb } = require('pdf-lib'), fontkit = require('@pdf-lib/fontkit');
const root = path.resolve(__dirname, '../../..'), pdfRoot = path.join(root, 'src/features/tools/pdf'), cache = new Map();
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports, name => {
    assert.ok(name.startsWith('.'), 'Only pure local geometry/layout helpers are loaded'); return load(path.resolve(path.dirname(file), name + '.ts'));
  });
  return exports;
}
const center = points => ({ x: points.reduce((sum, p) => sum + p.x, 0) / points.length, y: points.reduce((sum, p) => sum + p.y, 0) / points.length });
const contains = (points, p) => points.every((a, i) => { const b = points[(i + 1) % points.length]; return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x) >= -1; });
const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const normalize = text => text.normalize('NFC').replace(/\s+/gu, '');
function errors(a, b) {
  a = Array.from(a); b = Array.from(b); let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) { const row = [i + 1]; for (let j = 0; j < b.length; j++) row.push(Math.min(row[j] + 1, previous[j + 1] + 1, previous[j] + Number(a[i] !== b[j]))); previous = row; }
  return previous[b.length];
}

(async () => {
  const [rawFile, imageFile, baselineFile, referenceFile] = process.argv.slice(2);
  if (!rawFile || !imageFile) throw new Error('Expected raw.json input.jpg [baseline.json reference.json]');
  const raw = JSON.parse(fs.readFileSync(rawFile, 'utf8')), output = path.dirname(path.resolve(rawFile)), suffix = (raw.variant ?? (raw.detector.includes('server') ? 'server' : 'mobile')).replace(/[^a-z0-9-]/g, '');
  const image = await cv.loadImage(imageFile), sample = cv.createCanvas(Math.round(image.width * 768 / image.height), 768), context = sample.getContext('2d');
  context.drawImage(image, 0, 0, sample.width, sample.height);
  const gray = load(path.join(pdfRoot, 'utils/scan-analysis.ts')).toGray(context.getImageData(0, 0, sample.width, sample.height).data, sample.width, sample.height);
  const width = 595.28, height = 841.89, scale = width / image.width, offset = (height - image.height * scale) / 2;
  const toBase = p => ({ x: p.x * scale, y: p.y * scale + offset });
  const lines = raw.lines.map(line => ({ ...line, points: line.polygon.map(([x, y]) => ({ x, y })) }));
  const tables = load(path.join(pdfRoot, 'utils/ocr-ruled-tables.ts')).detectRuledTables(gray, [], p => toBase({ x: p.x * image.width / sample.width, y: p.y * image.height / sample.height }));
  for (const table of tables) for (const cell of table.cells) {
    const matches = lines.filter(line => contains(cell.bbox, toBase(center(line.points))));
    matches.sort((a, b) => center(a.points).y - center(b.points).y || center(a.points).x - center(b.points).x);
    cell.rawText = matches.map(line => line.text).join('\n');
  }
  const runs = lines.filter(line => line.text.trim()).map(line => {
    const [tl, tr, br, bl] = line.points, h = Math.max(Math.hypot(bl.x - tl.x, bl.y - tl.y), Math.hypot(br.x - tr.x, br.y - tr.y));
    return { text: line.text, origin: toBase({ x: tl.x + (bl.x - tl.x) * .85, y: tl.y + (bl.y - tl.y) * .85 }),
      width: Math.hypot(tr.x - tl.x, tr.y - tl.y) * scale, size: h * scale, angle: -Math.atan2(tr.y - tl.y, tr.x - tl.x) * 180 / Math.PI,
      eol: true, ascent: .8, descent: .2, fontName: 'ocr', fontFamily: 'sans-serif' };
  });
  const page = load(path.join(pdfRoot, 'utils/ocr-document.ts')).ocrDocumentPage({ runs, ocr: { layout: { tables } } }, { width, height }, 'paddle');
  const document = load(path.join(pdfRoot, 'utils/ocr-document-normalize.ts')).normalizeOcrDocument({ version: 1, pages: [page] });
  // The reference file is read only after OCR and document reconstruction are complete.
  fs.writeFileSync(path.join(output, `document-${suffix}.json`), JSON.stringify(document, null, 2));
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const fonts = {};
  for (const [key, name] of [['regular', 'Arimo-Regular.ttf'], ['bold', 'Arimo-Bold.ttf']]) fonts[key] = await pdf.embedFont(fs.readFileSync(path.join(root, 'src/assets/fonts', name)), { subset: true });
  const font = style => fonts[style.bold ? 'bold' : 'regular'], measure = (text, style) => font(style).widthOfTextAtSize(text, style.fontSize);
  const papers = load(path.join(pdfRoot, 'utils/ocr-document-layout.ts')).layoutOcrDocument(document, measure);
  for (const paper of papers) {
    const p = pdf.addPage([paper.width, paper.height]);
    for (const box of paper.borders) p.drawRectangle({ x: box.x, y: paper.height - box.y - box.height, width: box.width, height: box.height, borderWidth: .6, borderColor: rgb(.25, .3, .35) });
    for (const fragment of paper.fragments) for (const line of fragment.lines) {
      if (!line.text) continue;
      const remaining = fragment.width - (line.x - fragment.x) - measure(line.text, fragment), shift = fragment.align === 'right' ? remaining : fragment.align === 'center' ? remaining / 2 : 0;
      p.drawText(line.text, { x: line.x + Math.max(0, shift), y: paper.height - line.y - fragment.fontSize, size: fragment.fontSize, font: font(fragment) });
    }
  }
  const bytes = await pdf.save(), pdfFile = path.join(output, `paddle-${suffix}.pdf`); fs.writeFileSync(pdfFile, bytes);
  const baseline = baselineFile ? JSON.parse(fs.readFileSync(baselineFile, 'utf8')) : null, reference = referenceFile ? JSON.parse(fs.readFileSync(referenceFile, 'utf8')) : null;
  const rows = [];
  for (const expected of reference?.tables ?? []) {
    const current = tables.find(table => table.columns === expected.columns && table.rows === expected.rows), previous = baseline?.tables.find(table => table.columns === expected.columns && table.rows === expected.rows);
    for (const cell of expected.cells) {
      const value = table => table?.cells.find(c => c.row === cell.row && c.column === cell.column), before = value(previous)?.text ?? '', after = value(current)?.rawText ?? '';
      rows.push({ tableColumns: expected.columns, row: cell.row, column: cell.column, expected: cell.text, before, after,
        characters: normalize(cell.text).length, beforeErrors: errors(normalize(cell.text), normalize(before)), afterErrors: errors(normalize(cell.text), normalize(after)) });
    }
  }
  const characters = rows.reduce((sum, row) => sum + row.characters, 0), beforeErrors = rows.reduce((sum, row) => sum + row.beforeErrors, 0), afterErrors = rows.reduce((sum, row) => sum + row.afterErrors, 0);
  const metrics = { scope: 'Visible reference cells only; whitespace ignored, accents/case/digits/punctuation retained. Not a whole-document accuracy claim.', cells: rows.length, characters,
    baseline: { characterErrors: beforeErrors, cer: characters ? beforeErrors / characters : null, exactCells: rows.filter(row => row.beforeErrors === 0).length },
    paddle: { characterErrors: afterErrors, cer: characters ? afterErrors / characters : null, exactCells: rows.filter(row => row.afterErrors === 0).length },
    initializationSeconds: raw.initializationSeconds, inferenceSeconds: raw.inferenceSeconds, timingScope: raw.timingScope ?? 'Full PaddleOCR inference, excluding initialization/model download', pdfPages: papers.length, rows };
  fs.writeFileSync(path.join(output, `comparison-${suffix}.json`), JSON.stringify(metrics, null, 2));
  global.DOMMatrix = cv.DOMMatrix; global.ImageData = cv.ImageData; global.Path2D = cv.Path2D;
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs'), task = pdfjs.getDocument({ data: new Uint8Array(bytes) }), previews = [];
  try { const doc = await task.promise; for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i), viewport = page.getViewport({ scale: 1.4 }), c = cv.createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
    await page.render({ canvas: c, canvasContext: c.getContext('2d'), viewport }).promise;
    const png = c.toBuffer('image/png'); fs.writeFileSync(path.join(output, `paddle-${suffix}-${i}.png`), png); previews.push(`data:image/png;base64,${png.toString('base64')}`);
  } } finally { await task.destroy(); }
  const sourceData = `data:image/jpeg;base64,${fs.readFileSync(imageFile).toString('base64')}`;
  fs.writeFileSync(path.join(output, `report-${suffix}.html`), `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Thử PaddleOCR</title><style>body{font:16px system-ui;color:#172b40;margin:24px;background:#f4f8fc}main{max-width:1400px;margin:auto}.images{display:grid;grid-template-columns:1fr 1fr;gap:16px}img{width:100%;background:white}table{border-collapse:collapse;width:100%;background:white}td,th{padding:10px;border:1px solid #ccd7e0;text-align:left;vertical-align:top}td{white-space:pre-wrap}.bad{background:#fff1dc}.good{background:#e8f8ed}@media(max-width:700px){.images{grid-template-columns:1fr}.scroll{overflow:auto}}</style><main><h1>Thử PaddleOCR trên ảnh gốc</h1><p>Xử lý CPU tại local, mô hình ${escape(raw.detector)} + ${escape(raw.recognizer)}. Khung bảng dùng bộ dò của ứng dụng hiện có. Chưa thay OCR trong giao diện.</p><p>Thời gian nhận chữ: ${raw.inferenceSeconds.map(v => v.toFixed(2)+' giây').join(' / ')}. Khởi tạo/tải mô hình: ${raw.initializationSeconds.toFixed(2)} giây.</p><p>Đối chiếu ${rows.length} ô tham chiếu: Tesseract ${beforeErrors}/${characters} ký tự lỗi (${characters ? (beforeErrors/characters*100).toFixed(1) : '—'}%); PaddleOCR ${afterErrors}/${characters} (${characters ? (afterErrors/characters*100).toFixed(1) : '—'}%). Chỉ số này không đại diện toàn bộ tài liệu.</p><p><a href="paddle-${suffix}.pdf">Tải PDF thử nghiệm</a> · <a href="raw-${suffix}.txt">Chữ nhận dạng nguyên bản</a></p><div class="images"><div><h2>Ảnh gốc</h2><img src="${sourceData}"></div><div><h2>PDF dựng từ kết quả OCR</h2>${previews.map(src=>`<img src="${src}">`).join('')}</div></div><h2>So sánh từng ô</h2><div class="scroll"><table><thead><tr><th>Ô</th><th>Đối chiếu từ ảnh</th><th>Tesseract hiện tại</th><th>PaddleOCR</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${r.tableColumns} cột · ${r.row+1}/${r.column+1}</td><td>${escape(r.expected)}</td><td class="${r.beforeErrors?'bad':'good'}">${escape(r.before)}</td><td class="${r.afterErrors?'bad':'good'}">${escape(r.after)}</td></tr>`).join('')}</tbody></table></div></main></html>`);
  console.log(JSON.stringify({ detector: raw.detector, output: pdfFile, ...metrics, rows: undefined }, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; });
