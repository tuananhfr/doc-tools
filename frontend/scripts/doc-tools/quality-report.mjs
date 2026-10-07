import fs from 'node:fs'
import path from 'node:path'

const read = file => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null
const policy = read(new URL('./benchmark/release-policy.json', import.meta.url))
const search = read(process.env.SEARCH_REPORT ?? 'qa-output/search-v2/results.json')
const previous = read(process.env.OCR_BEFORE ?? 'qa-output/ocr-benchmark/results.json')
const current = read(process.env.OCR_AFTER ?? 'qa-output/ocr-v2-baseline/ocr-benchmark/results.json')
const outputs = read(process.env.OCR_OUTPUT_REPORT ?? 'qa-output/ocr-v2-check/ocr-v2/results.json')
const handwriting = read(process.env.HANDWRITING_REPORT ?? 'qa-output/handwriting/readiness.json')
const p0 = (process.env.P0_REPORTS ?? 'qa-output/p0-v2-1440/p0-journeys-1440/results.json,qa-output/p0-v2-390/p0-journeys-390/results.json').split(',').map(read)
const states = read(process.env.OCR_STATE_REPORT ?? 'qa-output/ocr-v2-states/ocr-states/results.json')
const layout = read(process.env.OCR_LAYOUT_REPORT ?? 'qa-output/ocr-v2-layout/ocr-layout/results.json')
const comparisons = (current?.cases ?? []).map(item => {
  const before = previous?.cases?.find(reference => reference.id === item.id)
  const comparable = Boolean(before?.metrics && item.metrics && before.inputSha256 === item.inputSha256)
  return { id: item.id, comparable, before: before?.metrics?.cer ?? null, after: item.metrics?.cer ?? null,
    regression: comparable && item.metrics.characterErrors > before.metrics.characterErrors }
})
const gates = [
  { name: 'Search deterministic checks', status: search && search.cases.length >= policy.minimumSearchStories && search.metrics.top1 === 1 && search.metrics.falseMatch === 0 ? 'passed' : 'pending' },
  { name: 'Human-reviewed Search stories', status: search?.cases.length && search.cases.every(item => item.reviewStatus === 'approved') ? 'passed' : 'pending' },
  { name: 'Clean printed OCR baseline', status: comparisons.filter(item => /CLEAN/u.test(item.id)).length && comparisons.filter(item => /CLEAN/u.test(item.id)).every(item => item.comparable && !item.regression) ? 'passed' : 'pending' },
  { name: 'All six reviewed output formats', status: outputs?.status === 'passed' && policy.outputs.every(format => outputs.cases.some(item => item.format === format && item.status === 'passed')) ? 'passed' : 'pending' },
  { name: 'Critical review on fixed fixtures', status: outputs?.criticalReview?.coverage === policy.ocr.criticalReviewCoverage ? 'passed' : 'pending' },
  { name: 'OCR recovery, privacy and offline states', status: states?.status === 'passed' && states.build === outputs?.build ? 'passed' : 'pending' },
  { name: 'Six table proposal fixtures evaluated', status: layout?.status === 'baseline-measured' && layout.cases.length >= 6 && layout.build === outputs?.build ? 'passed' : 'pending' },
  { name: 'P0 discovery and output journeys', status: p0.every(report => report?.status === 'passed' && policy.requiredP0.every(id => ['search','browse'].every(entry => report.cases.some(item => item.storyId === id && item.entry === entry && item.status === 'passed'))) && report.build === outputs?.build) ? 'passed' : 'pending' },
  { name: 'Validated local handwriting engine and real holdout', status: handwriting?.status === 'passed' ? 'passed' : 'blocked' },
]
const report = { createdAt: new Date().toISOString(), status: gates.every(gate => gate.status === 'passed') ? 'ready' : 'not-ready', policy, gates,
  search: search?.metrics ?? null, ocr: current?.summary ?? null, comparisons, rawTable: outputs?.rawTableMetrics ?? null,
  layout: layout ? { build: layout.build, status: layout.status, cases: layout.cases.map(item => ({ id: item.id, inputSha256: item.inputSha256, ...item.metrics })) } : null,
  handwriting: handwriting ? { status: handwriting.status, measurableCases: handwriting.measurableCases, accuracy: handwriting.accuracy, blockers: handwriting.models.flatMap(model => model.blockers) } : { status: 'unmeasured' },
  coverage: { outputs: outputs?.cases ?? [], p0: p0.map(item => ({ build: item?.build, status: item?.status, cases: item?.cases?.length ?? 0 })) },
  limitations: ['Draft Search examples are not human-approved ground truth.', 'Automated fixture actions are not real-user success or correction time.', 'Raw OCR regressions remain visible even if review can correct them.', 'Missing evidence never passes a release gate.'] }
const directory = path.resolve(process.env.QUALITY_OUT ?? 'qa-output/quality-v2')
fs.mkdirSync(directory, { recursive: true })
fs.writeFileSync(path.join(directory, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
const escape = value => String(value).replace(/[&<>"']/gu, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
const percent = value => value === null || value === undefined ? 'Chưa đo' : (value * 100).toFixed(2) + '%'
const table = (headers, rows) => `<div class="scroll"><table><thead><tr>${headers.map(header => `<th>${escape(header)}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${escape(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Chuyện Nhỏ — chất lượng Free</title><style>body{font:16px/1.6 system-ui,sans-serif;color:#102a51;background:#f4f8ff;margin:0}main{max-width:1100px;margin:auto;padding:32px 20px}h1{font-size:32px;line-height:1.2}h2{margin-top:36px;font-size:22px}.scroll{overflow:auto}table{width:100%;border-collapse:collapse;background:white}th,td{text-align:left;padding:12px;border-bottom:1px solid #dce6f5}th{color:#0759c9}code{overflow-wrap:anywhere}p,li{max-width:80ch}</style><main><h1>Chất lượng bản Free</h1><p>Trạng thái phát hành: <strong>${escape(report.status)}</strong>. Chỉ số từ bộ mẫu và kiểm thử tự động; không đại diện cho người dùng thật.</p><h2>Điều kiện phát hành</h2>${table(['Điều kiện','Kết quả'], gates.map(gate => [gate.name,gate.status]))}<h2>Search</h2>${table(['Top 1','Top 3','Không gán sai câu ngoài phạm vi'], [[percent(search?.metrics.top1),percent(search?.metrics.top3),percent(search ? 1-search.metrics.falseMatch : null)]])}<h2>OCR — so cùng đầu vào</h2>${table(['Mẫu','CER trước','CER sau','Hồi quy'],comparisons.map(item => [item.id,percent(item.before),percent(item.after),!item.comparable?'Không đủ bằng chứng so sánh':item.regression?'Có':'Không']))}<h2>Bảng</h2><p>Độ chính xác ô mẫu sạch (GRID-CLEAN) trước khi sửa: ${percent(report.rawTable?.accuracy)}. Ô trống và ô gộp được tính trong mẫu số.</p>${table(['Mẫu bảng','Ô đúng / tổng','Ô dư'],(report.layout?.cases ?? []).map(item => [item.id,`${item.correct}/${item.total}`,item.extra]))}<p>Phối cảnh chưa chọn góc, mực màu và vùng lóa vẫn có lỗi lớn; cần đối chiếu hoặc chụp lại. Bảng ở đây là đề xuất chưa được người dùng xác nhận.</p><h2>Chữ tay</h2><p>${escape(report.handwriting.status)}; ${escape(report.handwriting.measurableCases ?? 0)} mẫu có đáp án đã duyệt.</p><ul>${(report.handwriting.blockers ?? []).map(value => `<li>${escape(value)}</li>`).join('')}</ul><h2>Giới hạn bằng chứng</h2><ul>${report.limitations.map(value => `<li>${escape(value)}</li>`).join('')}</ul></main></html>`
fs.writeFileSync(path.join(directory, 'index.html'), html, 'utf8')
console.log(JSON.stringify({ directory, status: report.status, gates, regressions: comparisons.filter(item => item.regression).map(item => item.id) }))
if (process.argv.includes('--release-check') && report.status !== 'ready') process.exitCode = 1
