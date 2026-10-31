/* Reuse Paddle text polygons, then recognize their pixels locally with Vietnamese Tesseract.
 * Usage: node paddle-tesseract.cjs raw-mobile.json input.jpg
 * No reference/ground-truth data is read by this recognizer. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), cv = require('@napi-rs/canvas'), ts = require('typescript');
const { createWorker } = require('tesseract.js');
const root = path.resolve(__dirname, '../../..'), pdfRoot = path.join(root, 'src/features/tools/pdf'), cache = new Map();
function load(file) {
  file = path.resolve(file); if (cache.has(file)) return cache.get(file);
  const exports = {}; cache.set(file, exports);
  new Function('exports', 'require', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText)(exports, name => load(path.resolve(path.dirname(file), name + '.ts')));
  return exports;
}
const length = text => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
(async () => {
  const [rawFile, imageFile] = process.argv.slice(2), raw = JSON.parse(fs.readFileSync(rawFile, 'utf8')), bytes = fs.readFileSync(imageFile);
  if (crypto.createHash('sha256').update(bytes).digest('hex') !== raw.input.sha256) throw Error('Polygons do not belong to this image');
  const image = await cv.loadImage(imageFile), source = cv.createCanvas(image.width, image.height), sc = source.getContext('2d'); sc.drawImage(image, 0, 0);
  const pixels = sc.getImageData(0, 0, source.width, source.height);
  const { rectifyCellPixels } = load(path.join(pdfRoot, 'utils/ocr-cell-image.ts'));
  const { localOcrPixels } = load(path.join(pdfRoot, 'utils/ocr-local.ts'));
  const { enhancePixels } = load(path.join(pdfRoot, 'utils/ocr-image-variants.ts'));
  const started = performance.now(), worker = await createWorker('vie', 1, { langPath: path.join(root, 'public/vendor/tesseract'), cacheMethod: 'none' }), initialized = (performance.now() - started) / 1000;
  const lines = [], readingStarted = performance.now();
  try { for (const [index, line] of raw.lines.entries()) {
    if (/^[\d\s.,:/%+()-]+$/.test(line.text) && line.confidence >= .9) { lines.push({ ...line, keptNumeric: true }); continue; }
    const quad = line.polygon.map(([x, y]) => ({ x, y })), rect = rectifyCellPixels(pixels.data, source.width, source.height, quad);
    const scale = Math.min(3, Math.max(1, 36 / rect.height)), variants = [];
    for (const mode of ['contrast', 'local12', 'local30']) {
      const rgba = mode === 'contrast' ? enhancePixels(rect.data, 'contrast') : localOcrPixels(rect.data, rect.width, rect.height, mode === 'local12' ? .12 : .3);
      const crop = cv.createCanvas(rect.width + 16, rect.height + 16), context = crop.getContext('2d');
      context.fillStyle = 'white'; context.fillRect(0, 0, crop.width, crop.height); context.putImageData(new cv.ImageData(rgba, rect.width, rect.height), 8, 8);
      const enlarged = cv.createCanvas(Math.round(crop.width * scale), Math.round(crop.height * scale)); enlarged.getContext('2d').drawImage(crop, 0, 0, enlarged.width, enlarged.height);
      const { data } = await worker.recognize(enlarged.toBuffer('image/png'), { tessedit_pageseg_mode: '7' }, { blocks: true });
      const words = (data.blocks ?? []).flatMap(b => b.paragraphs.flatMap(p => p.lines.flatMap(l => l.words))).filter(word => word.text.trim());
      const confidence = words.reduce((sum, word) => sum + word.confidence * length(word.text), 0) / Math.max(1, words.reduce((sum, word) => sum + length(word.text), 0));
      variants.push({ mode, text: words.map(word => word.text).join(' ').trim().normalize('NFC'), confidence: confidence / 100 });
    }
    const fullest = Math.max(...variants.map(v => length(v.text))), eligible = variants.filter(v => length(v.text) >= fullest * .8);
    const best = eligible.sort((a, b) => b.confidence - a.confidence)[0] ?? variants[0];
    lines.push({ ...line, paddleText: line.text, ...best, variants });
    if ((index + 1) % 10 === 0) console.log(`Read ${index + 1}/${raw.lines.length} regions`);
  } } finally { await worker.terminate(); }
  const elapsed = (performance.now() - readingStarted) / 1000, report = { ...raw, variant: 'mobile-tesseract', engine: 'PaddleOCR detection + Vietnamese Tesseract recognition',
    recognizer: 'Tesseract vie-4.0.0_best_int, rectified individual lines', initializationSeconds: initialized, inferenceSeconds: [elapsed],
    timingScope: 'Tesseract line re-reading only; reuses Paddle polygons; excludes the preceding Paddle pass', lines };
  const output = path.dirname(path.resolve(rawFile)); fs.writeFileSync(path.join(output, 'raw-mobile-tesseract.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(output, 'raw-mobile-tesseract.txt'), lines.map(line => line.text).join('\n'));
  console.log(JSON.stringify({ lines: lines.length, initializationSeconds: initialized, recognitionSeconds: elapsed }));
})().catch(error => { console.error(error); process.exitCode = 1; });
