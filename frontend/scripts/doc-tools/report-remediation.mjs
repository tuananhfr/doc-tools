import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.env.QA_OUT ?? 'qa-output/2026-10-11-remediation')
const read = file => { const target = path.join(root, file); return fs.existsSync(target) ? JSON.parse(fs.readFileSync(target, 'utf8')) : null }
const build = fs.readFileSync('.next/BUILD_ID', 'utf8').trim()
const responsive = read('responsive-490.json')
const reader = read('reader-editor-final/results.json')
const journeys = read('journeys-final/results.json')
const compact = read('compact-final/results.json')
const client = read('client-states/results.json')
const golden = read('golden/results.json')
const search = read('search-seeds/results.json')
const independent = read('independent-search/results.json')
const populated = read('populated-tools/results.json')
const media = read('media-tools/results.json')
const unit = read('verification/unit.json')
const lint = read('verification/lint.json')
const runs = read('verification/browser-runs-final.json')
const utility = runs?.runs.find(row => row.name === 'utility-camera')?.output
const p0 = [320, 390, 1366].map(width => read(`p0-journeys-${width}/results.json`))
const quality = read('quality/report.json')
const deferred = read('ocr-deferred.json')
const baseline = JSON.parse(fs.readFileSync('qa-output/2026-10-11-mobile-ux/report.json', 'utf8'))
const same = report => report?.build === build
const suites = [
  { name: 'Unit tests', passed: unit?.code === 0 && same(unit), result: '167 files · 2.189 tests', file: 'verification/unit.log', build: unit?.build },
  { name: 'TypeScript', passed: lint?.code === 0 && same(lint), result: 'tsc --noEmit', file: 'verification/lint.json', build: lint?.build },
  { name: 'Responsive: toàn bộ 68 tools + danh mục/trang chủ', passed: responsive?.status === 'passed' && responsive.checks.length === 490, result: '490 lượt · 7 viewport', file: 'responsive-490.json', build: responsive?.build },
  { name: 'Xem/chỉnh PDF sau sửa phím tắt', passed: reader?.status === 'passed' && same(reader) && reader.checks.length === 14, result: '14 lượt · 7 viewport', file: 'reader-editor-final/results.json', build: reader?.build },
  { name: 'Luồng sửa UI, preview, dữ liệu và in A4', passed: journeys?.status === 'passed' && journeys.checks.length === 45, result: '45/45 · 320/390/430px', file: 'journeys-final/results.json', build: journeys?.build },
  { name: 'Màn thấp', passed: compact?.status === 'passed' && compact.checks.length === 15, result: '15/15 · 390×460px', file: 'compact-final/results.json', build: compact?.build },
  { name: 'Offline, hủy/chạy lại, handoff và phím tắt PDF', passed: client?.status === 'passed' && same(client) && client.checks.length === 5, result: `${client?.checks.filter(row => row.status === 'passed').length ?? 0}/5`, file: 'client-states/results.json', build: client?.build },
  { name: 'Golden: so nội dung đầu ra không gồm OCR', passed: golden?.summary.match === 33 && golden.summary.ran === 33 && golden.scope === 'non-ocr' && same(golden) && !golden.errors.length, result: `${golden?.summary.match ?? 0}/33 · 2 ca OCR để đợt cuối`, file: 'golden/results.json', build: golden?.build },
  { name: 'Search: bộ tình huống nguồn', passed: same(search) && search?.cases.length === 104 && search.metrics.top1 === 1 && search.metrics.falseMatch === 0, result: '92 câu trong phạm vi + 12 câu ngoài phạm vi', file: 'search-seeds/results.json', build: search?.build },
  { name: 'Search: truy vấn đã lưu ngoài bộ seed', passed: independent?.status === 'passed' && same(independent) && independent.cases.length === 47, result: '47/47 · chạy qua giao diện', file: 'independent-search/results.json', build: independent?.build },
  { name: 'P0: tìm/browse → xử lý → xác minh file', passed: p0.every(report => report?.status === 'passed' && same(report) && report.cases.length === 12), result: `${p0.reduce((sum, report) => sum + (report?.summary.passed ?? 0), 0)}/36 · 6 tác vụ × 2 đường vào × 3 viewport`, file: 'p0-journeys-390/results.json', build: p0[1]?.build },
  { name: 'Smoke giao diện: nhập liệu, cuộn và tabs', passed: populated?.status === 'passed' && same(populated), result: `${populated?.tools.filter(row => row.status === 'passed').length ?? 0} tools; đầu vào chuyên biệt kiểm tra riêng; 2 màn OCR hoãn`, file: 'populated-tools/results.json', build: populated?.build },
  { name: 'Hồi quy 6 bộ harness ảnh/PDF/tính toán', passed: runs?.runs.filter(row => ['image-extra', 'image-tools', 'money-date', 'page-tools', 'password', 'sign-compare'].includes(row.name)).length === 6 && runs.runs.filter(row => ['image-extra', 'image-tools', 'money-date', 'page-tools', 'password', 'sign-compare'].includes(row.name)).every(row => row.code === 0 && !row.output?.errors?.length), result: 'Quan sát hành vi + file xuất; kết quả gốc giữ trong log', file: 'verification/browser-runs-final.json', build: runs?.build },
  { name: 'QR: tạo/đọc/camera', passed: utility?.camera?.found === true && utility.camera.hit?.text === 'https://erpcons.vn' && utility.camera.afterWait === 1 && utility.camera.afterOff.tracks.length > 0 && utility.camera.afterOff.tracks.every(state => state === 'ended') && utility.camera.afterLeave.length > 0 && utility.camera.afterLeave.every(state => state === 'ended') && !utility.errors?.length, result: 'Camera giả: đọc đúng, không lặp, dừng tracks khi tắt/rời màn', file: 'verification/utility-camera.stdout.log', build: runs?.build },
  { name: 'Video/GIF/âm thanh', passed: media?.status === 'passed' && same(media) && media.cases.length === 4, result: `${media?.cases.filter(row => row.status === 'passed').length ?? 0}/4 · kiểm tra chữ ký định dạng`, file: 'media-tools/results.json', build: media?.build },
]
const fixes = [
  ['MU-01', 'Quay lại đúng danh mục, giữ q/nhóm/vị trí cuộn; handoff sang editor giữ nguồn điều hướng.', 'journeys-final/390-directory-return.png'],
  ['MU-02', 'Tách trình xem từng trang khỏi thanh sửa. Thanh sửa thu gọn 110px; menu mở cuộn được trên màn thấp. Ctrl+F mở tìm; phím sửa và thay chữ chỉ dùng trong editor.', 'compact-final/390-pdf-editor-menu.png'],
  ['MU-03', 'Kết quả Free của điện/nước, lương và địa chỉ đứng trước khối mời Pro.', 'journeys-final/390-electricity.png'],
  ['MU-04', 'CV và mẫu giấy tờ có tab nhập/xem trước giữ dữ liệu; khái toán và lương gấp tùy chọn nâng cao.', 'journeys-final/390-cv-preview.png'],
  ['MU-05', 'Ký, đóng dấu, đánh số PDF và ảnh thẻ có tab điều khiển/preview, nút xử lý cạnh preview. Hàng chuyển trang xuống dòng ở 320px.', 'journeys-final/320-sign-preview.png'],
  ['MU-06', 'Tìm kiếm và chọn nhóm bám khi cuộn; nhóm dùng select trên mobile; danh mục một cột gọn.', 'sweep-final/320-directory-initial.png'],
  ['MU-07', 'Mã QR và nút tải đứng trước mục màu sắc tùy chọn.', 'journeys-final/390-qr-result.png'],
  ['MU-08', 'Select đơn vị rộng toàn hàng; mã vạch giải thích rõ preview thu nhỏ và kích thước in.', 'sweep-final/320-unit-convert-initial.png'],
  ['MU-09', 'Bảng giá/bậc thuế/bảng địa chỉ nhập bằng cột có nhãn; cú pháp thô nằm ở tùy chọn nâng cao. Nhãn ICS/JSON dễ hiểu. Cấu hình OCR riêng để cuối.', 'journeys-final/390-address.png'],
  ['MU-10', 'Hiện 68 tools đang dùng và tùy chọn bật 19 tools sắp có; tìm kiếm không đưa tool chưa dùng vào kết quả.', 'sweep-final/320-directory-initial.png'],
  ['MU-11', 'Phần đầu màn gọn; ngôn ngữ/giao diện/tài khoản chuyển vào menu mobile, các mục vẫn truy cập được.', 'journeys-final/390-menu.png'],
]
const summary = {
  createdAt: new Date().toISOString(), build, scope: 'non-ocr', status: suites.every(suite => suite.passed) ? 'verified-with-deferred-ocr' : 'verification-incomplete',
  suites, fixes: fixes.map(([id, change]) => ({ id, change })),
  otherFixes: ['SEARCH-01/02: phân biệt nền/nén, yêu cầu đủ đối tượng và mục đích, xử lý câu dài và truy vấn ngoài phạm vi', 'GAP-02: biên nhận tiền trong mẫu giấy tờ hiện có; số tiền nguyên dương, ngày hợp lệ, đọc tiền bằng chữ, chữ ký hai bên, in A4', 'QA-01/02: build ID trên bằng chứng, selector camera đúng, release gate tách OCR và giữ Search draft chờ người duyệt', 'VI-01: nhãn lịch điện thoại/backup dễ hiểu, đồng bộ guides và catalog backend'],
  releaseStatus: quality?.status ?? 'pending', deferred,
  limitations: ['Chrome trên Windows, viewport/touch giả lập; chưa kiểm tra Safari iPhone, Android thật, bàn phím thật, pinch zoom hoặc zoom trình duyệt 150%.', 'API tài khoản/Pro/dữ liệu quy định giả lập; chưa chứng minh backend thật, AI/Pro hoặc gửi biểu mẫu lên hệ thống.', 'Camera QR dùng video giả; microphone/nhận dạng giọng nói/cảm biến la bàn và hộp thoại chia sẻ/in của hệ điều hành cần máy thật.', '104 tình huống Search còn draft. 47 truy vấn đã lưu là replay đã dùng trong quá trình sửa, không phải tập blind holdout hay đáp án đã được người duyệt.', '490 ảnh responsive và 60 luồng UI ở build trước phần sửa phím tắt PDF. Sau đó kiểm tra lại 14 màn reader/editor và các luồng bị ảnh hưởng trên build cuối. Mỗi bộ giữ build ID riêng.', 'Các harness quan sát không thay thế bộ Golden và P0 có bộ xác minh đầu ra. Không suy ra tỷ lệ thành công hoặc thời gian của người dùng thật.', 'VI/EN của nhãn mới được rà; 13 locale khác giữ fallback tiếng Anh theo convention hiện có.'],
  attempts: ['Các lần build bị thiếu bộ nhớ đã chạy lại bằng một worker và heap nhỏ; không thay cấu hình repo.', 'Các lượt Chrome crash/timeout khi chạy song song đã lưu; viewport bị ảnh hưởng được chạy lại riêng.', 'Lỗi tràn hàng ký PDF 320px, menu editor che màn thấp, Ctrl+F và Delete trong reader có bằng chứng trước/sau.', 'Selector QA gõ sai slug đơn vị/nhãn Sửa tiếp đã được sửa; ảnh 404 của lần thử không coi là lỗi route ứng dụng.'],
  originalReports: ['../2026-10-11-mobile-ux/report.html', '../2026-10-11-baseline/chuyen-nho-qa-20261011/summary.json'],
  git: 'No commit, push or deploy. Existing CLAUDE.md and landing-host-proxy.md edits preserved.',
}
summary.attempts.push('P0 ban đầu dùng nhầm manifest fixtures; chạy lại bằng bộ fixtures gốc đầy đủ. Camera giả ban đầu có mã quá lớn cho khung dọc; thu nhỏ fixture rồi xác minh lại đọc mã và dừng stream.')
summary.attempts.push('Ảnh smoke tính ngày bắt vào lúc tải tạm thời sau khi nhập; kiểm tra bổ sung với hai ngày hợp lệ đã xác nhận trường nhập và kết quả ổn định.')
summary.limitations.push('Bộ smoke nhập dữ liệu mẫu hoặc dữ liệu sai và rà hình học, cuộn, tabs. Một số tool cần video, XML, AI/model hoặc phần cứng vẫn ở trạng thái đầu vào; không coi 66 smoke là 66 ca xác minh đầu ra.')
fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8')
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char])
const link = (file, label) => `<a href="${esc(encodeURI(file))}">${esc(label)}</a>`
const image = (file, label) => fs.existsSync(path.resolve(root, file)) ? `<a href="${esc(encodeURI(file))}"><img src="${esc(encodeURI(file))}" loading="lazy" alt="${esc(label)}"></a>` : '<p>Ảnh chưa có.</p>'
const comparison = ([id, change, after]) => {
  const issue = baseline.issues.find(item => item.id === id)
  const before = (JSON.stringify(issue).match(/[A-Za-z0-9_./-]+\.png/g) ?? []).map(file => '../2026-10-11-mobile-ux/' + file).find(file => fs.existsSync(path.resolve(root, file)))
  return `<details><summary>${esc(id)} · ${esc(issue?.title)}</summary><p>${esc(change)}</p><div class="pair"><figure>${before ? image(before, 'Trước sửa') : ''}<figcaption>Trước</figcaption></figure><figure>${image(after, 'Sau sửa')}<figcaption>Sau</figcaption></figure></div></details>`
}
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chuyện Nhỏ — kết quả sửa UI và logic</title><style>
body{margin:0;background:#f3f7fc;color:#10294b;font:16px/1.65 system-ui,sans-serif}main{max-width:1120px;margin:auto;padding:32px 20px 64px}h1{font-size:32px;line-height:1.25}h2{margin-top:36px;font-size:22px}a{color:#075ad6}code{overflow-wrap:anywhere}section,details{background:white;border:1px solid #dbe5f2;border-radius:12px;padding:18px;margin:12px 0}summary{cursor:pointer;font-weight:650;min-height:44px}.status{font-weight:700;color:#165e3a}.pending{color:#905008}.scroll{overflow-x:auto}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;padding:12px;border-bottom:1px solid #dbe5f2}th{background:#edf4ff}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}.pair figure{margin:0}.pair img{display:block;width:100%;max-width:390px;max-height:650px;object-fit:contain;object-position:top;background:#f3f7fc}.pair figcaption{margin-top:8px;font-weight:600}li{margin:6px 0}.note{color:#526783;font-size:14px}@media(max-width:600px){main{padding:20px 12px}h1{font-size:26px}.pair{grid-template-columns:1fr}}
</style></head><body><main><p class="note">11/10/2026 · Sửa theo kế hoạch đã duyệt · OCR làm cuối cùng</p><h1>Kết quả sửa giao diện và logic công cụ</h1><p class="status">${summary.status === 'verified-with-deferred-ocr' ? 'Đã xác minh phần không gồm OCR.' : 'Đang hoàn tất kiểm chứng.'}</p><p>Build cuối: <code>${esc(build)}</code>. Đã sửa tìm kiếm, luồng mobile, mẫu biên nhận và các lỗi phát hiện khi kiểm tra lại. ${link('summary.json', 'Dữ liệu tổng hợp')} · ${link('../2026-10-11-mobile-ux/report.html', 'Báo cáo lỗi ban đầu')}</p>
<section><h2>Kiểm chứng</h2><div class="scroll"><table><thead><tr><th>Bộ kiểm tra</th><th>Kết quả</th><th>Bằng chứng / build</th></tr></thead><tbody>${suites.map(suite => `<tr><td>${esc(suite.name)}</td><td class="${suite.passed ? 'status' : 'pending'}">${suite.passed ? 'Đạt' : 'Chưa đạt / đang chờ'}<br>${esc(suite.result)}</td><td>${link(suite.file, 'Mở kết quả')}<br><code>${esc(suite.build)}</code></td></tr>`).join('')}</tbody></table></div><p class="note">Viewport: 320, 360, 390, 430, 768, 1366 và 1920px; màn thấp 390×460px. Screenshot của từng route nằm trong các manifest. OCR chỉ kiểm tra vỏ giao diện chung.</p></section>
<h2>Đối chiếu các lỗi giao diện đã lưu</h2>${fixes.map(comparison).join('')}
<section><h2>Logic và kiểm thử</h2><ul>${summary.otherFixes.map(value => `<li>${esc(value)}</li>`).join('')}</ul>${image('journeys-final/390-receipt-preview.png', 'Biên nhận tiền')}<p>${link('journeys-final/390-receipt.pdf', 'PDF biên nhận A4')} · ${link('reader-keyboard-before.json', 'Lỗi phím tắt trước sửa')} · ${link('client-states/results.json', 'Kiểm tra lại phím tắt')}</p></section>
<section><h2>OCR — phần riêng làm cuối</h2><p>Chưa sửa engine hoặc quy trình OCR riêng trong đợt này. ${link('ocr-deferred.json', 'Danh sách công việc, file và tiêu chí kiểm chứng')}</p><ol>${deferred.items.map(item => `<li><strong>${esc(item.id)} · ${esc(item.title)}</strong><p>${esc(item.work)}</p><p class="note">${esc(item.acceptance)}</p></li>`).join('')}</ol></section>
<section><h2>Điều kiện phát hành và giới hạn</h2><p>Trạng thái release gate: <strong>${esc(summary.releaseStatus)}</strong>. Các bộ tự động đạt không thay cho việc BA/QA duyệt đáp án Search. ${link('quality/index.html', 'Chi tiết gate không gồm OCR')}</p><ul>${summary.limitations.map(value => `<li>${esc(value)}</li>`).join('')}</ul></section>
<details><summary>Các lần thử, lỗi môi trường và cách xử lý</summary><ul>${summary.attempts.map(value => `<li>${esc(value)}</li>`).join('')}</ul></details><p class="note">Không commit/push/deploy. Giữ nguyên báo cáo ban đầu và các thay đổi có sẵn trong CLAUDE.md, docs/landing-host-proxy.md.</p></main></body></html>`
fs.writeFileSync(path.join(root, 'report.html'), html, 'utf8')
console.log(JSON.stringify({ status: summary.status, build, passed: suites.filter(suite => suite.passed).length, total: suites.length }))
