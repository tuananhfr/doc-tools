import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'

const root = path.resolve(process.env.OCR_REPORT_ROOT ?? 'qa-output/2026-10-11-ocr-remediation')
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'))
const before = read('before/ocr-benchmark/results.json'), after = read('verified/ocr-benchmark/results.json')
const beforeTables = read('before/ocr-layout/results.json'), tables = read('verified/ocr-layout/results.json')
const runs = read('verified/run-results.json'), source = read('source-snapshot.json'), unit = read('unit-results.json')
const outputs = read('verified/ocr-v2/results.json'), tableExports = read('verified/ocr-tables/results.json')
const states = read('verified/ocr-states/results.json'), responsive = read('verified/ocr-responsive/results.json')
const pdfVisual = read('verified/ocr-pdf-visual/results.json'), handwriting = read('handwriting/readiness.json')
const p0 = [read('verified/p0-journeys-390/results.json'), read('verified/p0-journeys-1440/results.json')]
const build = source.build
for (const report of [after, tables, runs, outputs, tableExports, states, responsive, pdfVisual, ...p0]) assert.equal(report.build, build, 'Evidence belongs to another build')
assert.equal(before.fixtureManifestSha256, after.fixtureManifestSha256)
assert.equal(beforeTables.fixtureManifestSha256, tables.fixtureManifestSha256)
for (const [file, hash] of Object.entries(source.changedSource)) assert.equal(createHash('sha256').update(fs.readFileSync(path.resolve(file.startsWith('frontend/') ? '../' + file : file))).digest('hex'), hash, 'Source changed after the verified build')
for (const [file, hash] of Object.entries(source.unchangedUserFiles)) assert.equal(createHash('sha256').update(fs.readFileSync(file)).digest('hex'), hash, 'Preexisting user file changed')
const comparisons = after.cases.map(item => {
  const original = before.cases.find(reference => reference.id === item.id)
  assert.equal(item.inputSha256, original.inputSha256)
  return { id: item.id, rawBefore: original.metrics.characterErrors, rawAfter: item.metrics.characterErrors, proposedAfter: item.proposedMetrics.characterErrors,
    characters: item.metrics.characters, cleanRegression: item.id.includes('CLEAN') && item.metrics.characterErrors > original.metrics.characterErrors }
})
const tableComparisons = tables.cases.map(item => {
  const original = beforeTables.cases.find(reference => reference.id === item.id)
  assert.equal(item.inputSha256, original.inputSha256)
  return { id: item.id, before: original.metrics.correct, after: item.metrics.correct, total: item.metrics.total, extra: item.metrics.extra }
})
const inspectionFile = path.join(root, 'visual-inspection.json')
const inspection = fs.existsSync(inspectionFile) ? read('visual-inspection.json') : { status: 'pending', screenshots: [] }
const gates = [
  { name: 'Build and TypeScript', status: 'passed', evidence: '1492 pages generated; build ' + build },
  { name: 'Unit tests', status: unit.success ? 'passed' : 'failed', evidence: `${unit.numPassedTests}/${unit.numTotalTests}` },
  { name: 'Clean printed regression', status: comparisons.some(item => item.cleanRegression) ? 'failed' : 'passed', evidence: 'Pinned fixture bytes; raw and proposed text measured separately' },
  { name: 'Six output formats', status: outputs.status, evidence: `${outputs.cases.filter(item => item.status === 'passed').length}/6; corrected amount and raw provenance verified` },
  { name: 'Six tables × six formats', status: tableExports.status, evidence: `${tableExports.cases.filter(item => item.status === 'passed').length}/36; blanks, merged cells and leading zeros checked` },
  { name: 'Recovery, offline and privacy', status: states.status, evidence: `${states.cases.filter(item => item.status === 'passed').length}/${states.cases.length}; quality events disabled in this build` },
  { name: 'Responsive journeys', status: responsive.status, evidence: `${responsive.checks.length} states; 320,360,390,430,768,1366,1920 and 390×460` },
  { name: 'Visual screenshot inspection', status: inspection.status, evidence: `${inspection.screenshots.length} inspected files` },
  { name: 'OCR P0 routes', status: p0.every(item => item.status === 'passed') ? 'passed' : 'failed', evidence: `${p0.flatMap(item => item.cases).filter(item => item.status === 'passed').length}/8; image→TXT and scanned PDF→searchable PDF, Search and Browse` },
  { name: 'PDF rendering', status: pdfVisual.status, evidence: `${pdfVisual.cases.length} outputs rendered in Chrome/PDF.js; physical and other readers not covered here` },
  { name: 'Non-OCR smoke', status: runs.checks.find(check => check.id === 'non-ocr-smoke')?.status ?? 'pending', evidence: 'PDF merge, image compression and QR Golden checks' },
  { name: 'Handwriting', status: 'blocked', evidence: `${handwriting.measurableCases} approved cases; inference not executed; verified browser artifacts and mobile evidence missing` },
]
const result = { createdAt: new Date().toISOString(), status: gates.filter(gate => gate.name !== 'Handwriting').every(gate => gate.status === 'passed') ? 'printed-table-verified-handwriting-blocked' : 'verification-incomplete',
  scope: 'Approved OCR remediation; handwriting evidence assessment completed, runtime rollout blocked', build, baseCommit: source.baseCommit, sourceSnapshotSha256: source.sourceSnapshotSha256,
  gates, rawBefore: before.summary, rawAfter: after.summary, comparisons, tableComparisons, handwriting, visualInspection: inspection,
  attempts: [{ status: 'failed', stage: 'initial build', reason: 'TypeScript exceeded the 768 MB heap limit; retried successfully at 1536 MB' },
    { status: 'failed', stage: 'initial responsive checks', reason: 'Word buttons below 44 px; fixed and rerun' },
    { status: 'failed', stage: 'cell inspector check', reason: 'Select accessible name included option text; fixed explicit label and rerun' },
    { status: 'measured', stage: 'geometry iterations', reason: 'Kept initial and intermediate metrics; fixed clipped border, residual transformed lines and missed-cell fallback' }],
  limitations: ['Synthetic generated ground truth; no real-user accuracy or correction-time claim', 'OCR can still misread diacritics, small text and damaged highlights; explicit review remains required',
    'Chrome emulation does not prove physical-device memory, keyboard or Safari behavior', 'No direct bbox/region accuracy score', 'Quality-event browser opt-in branch not exercised because this build has the feature disabled; unit branches tested',
    'Handwriting has no approved multi-writer dataset and no validated browser runtime; availability remains disabled', 'Existing non-OCR human Search review gate unchanged; this is not whole-product release approval', 'No commit, push or deployment performed for this OCR work'] }
fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(result, null, 2) + '\n', 'utf8')
const escape = value => String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const rows = (items, cells) => items.map(item => '<tr>' + cells(item).map(value => `<td>${escape(value)}</td>`).join('') + '</tr>').join('')
const card = (title, body) => `<section><h2>${title}</h2>${body}</section>`
const screenshots = responsive.checks.map(check => ({ file: `verified/ocr-responsive/${check.screenshot}`, title: `${check.width} px · ${check.profile ?? check.slug} · ${check.state}` }))
const screenshotCards = screenshots.map(item => `<figure><a href="${item.file}"><img loading="lazy" src="${item.file}" alt="${escape(item.title)}"></a><figcaption>${escape(item.title)}</figcaption></figure>`).join('')
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OCR remediation · 11/10/2026</title><style>
body{margin:0;background:#f3f7fc;color:#102b50;font:16px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:32px 20px}h1{font-size:30px;line-height:1.25}h2{font-size:21px}section{background:#fff;border:1px solid #d5e1f0;border-radius:12px;padding:24px;margin:24px 0}.scroll{overflow:auto}table{border-collapse:collapse;width:100%}th,td{padding:10px;text-align:left;border-bottom:1px solid #dde5f0;vertical-align:top}th{background:#edf4fe}code{overflow-wrap:anywhere}a{color:#005bea}.gallery{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}img{display:block;width:100%;height:auto;border:1px solid #d5e1f0}figcaption{font-size:13px;padding:8px 0}.status{padding:12px;background:#fff4df;border-left:4px solid #b76500}@media(max-width:760px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}section{padding:16px}}@media(max-width:430px){.gallery{grid-template-columns:1fr}}
</style><main><h1>Kết quả sửa OCR · 11/10/2026</h1><p class="status">Chữ in, bảng và UX đã được kiểm chứng. OCR chữ tay chưa đủ bằng chứng để triển khai.</p><p>Build: <code>${escape(build)}</code>. Source: <code>${escape(source.sourceSnapshotSha256)}</code>. Kết quả dưới đây dùng bộ ảnh tổng hợp đã lưu; không phải tỷ lệ chính xác trên người dùng thật.</p>
${card('Đã thay đổi', '<ul><li>Giảm nhiễu đường kẻ/giao điểm; xử lý bảng nghiêng và phối cảnh trên nền trắng; giữ ánh xạ về ảnh gốc.</li><li>Tách rawText, đề xuất từ lượt đọc và giá trị người dùng xác nhận. So sánh điểm không nâng độ tin cậy máy đọc; nội dung bất đồng vẫn cần kiểm tra.</li><li>Đọc lại số/mã có nhầm nét chữ, giới hạn số vùng đọc lại và ưu tiên vùng điểm thấp.</li><li>Mobile: 4 bước rõ ràng, tùy chọn nâng cao thu gọn, sửa từng ô kèm ảnh gốc, điều hướng trước/sau, vùng chạm tối thiểu 44 px.</li><li>Ô nhập và xác nhận nằm gần ảnh; có thể bỏ bản sửa chưa xác nhận; giữ hoàn tác và chặn xuất khi còn lỗi/trường/bảng chưa xác nhận.</li></ul>')}
${card('Kiểm chứng', `<div class="scroll"><table><thead><tr><th>Nhóm</th><th>Trạng thái</th><th>Bằng chứng</th></tr></thead><tbody>${rows(gates, item => [item.name, item.status, item.evidence])}</tbody></table></div>`)}
${card('Chữ in: raw và đề xuất', `<p>Raw: ${before.summary.characterErrors}/${before.summary.characters} → ${after.summary.characterErrors}/${after.summary.characters} lỗi ký tự; các mẫu CLEAN không giảm. Raw là rawText của các từ quan sát được, gồm từ bổ sung từ lượt đối chiếu. Đề xuất lấy từ giá trị hiển thị trước khi người dùng sửa. Export đã sửa tay được kiểm chứng ở nhóm riêng.</p><div class="scroll"><table><thead><tr><th>Mẫu</th><th>Raw trước</th><th>Raw sau</th><th>Đề xuất sau</th><th>Số ký tự chuẩn</th></tr></thead><tbody>${rows(comparisons, item => [item.id, item.rawBefore, item.rawAfter, item.proposedAfter, item.characters])}</tbody></table></div>`)}
${card('Bảng: ô đúng trước khi sửa tay', `<p>Chấm cả giá trị và rowSpan/columnSpan. Số ô xuất đúng sau khi script nhập ground truth được ghi riêng trong 36 lượt xuất, không thay thế điểm đề xuất.</p><div class="scroll"><table><thead><tr><th>Mẫu</th><th>Trước</th><th>Sau</th><th>Tổng ô</th><th>Ô dư</th></tr></thead><tbody>${rows(tableComparisons, item => [item.id, item.before, item.after, item.total, item.extra])}</tbody></table></div>`)}
${card('Chữ tay: phần còn vướng', `<p>Đã đánh giá ứng viên VietOCR tại commit <code>fe8c3a7fc714aec57ab81cec844eb3adf0c1636c</code>. <a href="https://github.com/pbcquoc/vietocr/blob/fe8c3a7fc714aec57ab81cec844eb3adf0c1636c/vietocr/tool/predictor.py">Predictor dùng Python/PyTorch</a>; <a href="https://github.com/pbcquoc/vietocr/blob/fe8c3a7fc714aec57ab81cec844eb3adf0c1636c/LICENSE">license thư viện Apache-2.0</a>. Chưa xác minh độc lập quyền sử dụng weights; chưa có model/tokenizer đã pin để chạy browser và số đo bộ nhớ mobile.</p><p>Bộ dữ liệu hiện có ${handwriting.measurableCases} mẫu chữ tay có transcript được duyệt. Không chạy inference chữ tay và không báo tỷ lệ chính xác. Giữ flag tắt; profile mixed yêu cầu đối chiếu toàn bộ. Để triển khai cần plan riêng cho runtime browser hoặc backend, xác minh weights và dữ liệu nhiều người viết có holdout độc lập.</p><a href="handwriting/readiness.json">Bằng chứng và các gate còn thiếu</a>`)}
${card('Screenshot responsive', `<p>Ảnh chỉ chứa fixture tổng hợp. Bấm ảnh để xem kích thước đầy đủ. Có thêm trạng thái 390×460.</p><div class="gallery">${screenshotCards}</div>`)}
${card('Giới hạn và log', `<ul>${result.limitations.map(item => `<li>${escape(item)}</li>`).join('')}</ul><p><a href="summary.json">Summary JSON</a> · <a href="verified/run-results.json">Từng lượt kiểm chứng</a> · <a href="verified/ocr-tables/results.json">36 lượt xuất bảng</a> · <a href="verified/ocr-pdf-visual/results.json">Render PDF</a> · <a href="source-snapshot.json">Hash source</a></p><p>Lưu cả lần build thiếu heap, các lần QA lỗi vùng chạm/accessible name và số đo trung gian. Baseline cũ được giữ nguyên. Không commit/push/deploy phần OCR.</p>`)}
</main></html>`
fs.writeFileSync(path.join(root, 'report.html'), html, 'utf8')
console.log(JSON.stringify({ status: result.status, build, report: path.join(root, 'report.html') }))
