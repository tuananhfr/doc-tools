import fs from 'node:fs'
import { chromium, FIX } from '../lib/qa.mjs'

// Văn bản kiểu Word: danh sách chấm đầu dòng, danh sách đánh số, đoạn thụt đầu dòng, chân trang —
// mẫu cho Sửa chữ viết lại trang (ký hiệu đầu dòng phải đứng yên, phần dưới bị đẩy xuống).
const HTML = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 25mm 20mm; }
  body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.35; }
  h1 { font-size: 15pt; margin: 0 0 5mm; }
  ul, ol { margin: 0 0 5mm; padding-left: 9mm; }
  p { text-indent: 10mm; margin: 0 0 4mm; }
  .chan { position: fixed; bottom: 0; left: 0; right: 0; text-indent: 0; text-align: center; font-size: 9pt; }
</style>
</head>
<body>
<h1>Nguyên tắc nghiệm thu hạng mục</h1>
<ul>
  <li>Nhà thầu tự kiểm tra trước khi mời giám sát.</li>
  <li>Biên bản lập tại hiện trường, có chữ ký ba bên.</li>
  <li>Ảnh chụp kèm toạ độ và thời điểm.</li>
</ul>
<ol>
  <li>Kiểm tra hồ sơ chất lượng vật liệu đầu vào.</li>
  <li>Đo đạc kích thước hình học theo bản vẽ.</li>
</ol>
<p>Trường hợp phát hiện sai lệch vượt dung sai cho phép, tư vấn giám sát lập biên bản không phù hợp và yêu cầu nhà thầu đề xuất biện pháp khắc phục trong vòng ba ngày làm việc kể từ ngày nhận biên bản.</p>
<p>Khối lượng nghiệm thu là cơ sở thanh toán của đợt kế tiếp.</p>
<p class="chan">Ban quản lý dự án Cầu Rồng — lưu hành nội bộ</p>
</body>
</html>`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
fs.writeFileSync(FIX + 'danh-sach.html', HTML)
await page.goto('file:///' + FIX + 'danh-sach.html')
await page.pdf({ path: FIX + 'danh-sach.pdf', format: 'A4', preferCSSPageSize: true })
await browser.close()
console.log('ok')
