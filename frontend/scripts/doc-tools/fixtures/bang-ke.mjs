import fs from 'node:fs'
import { chromium, FIX } from '../lib/qa.mjs'

// Bảng kê có lớp chữ: đoạn văn 3 dòng + bảng, cột mã có số 0 đầu — mẫu cho PDF → Word/Excel.
const HTML = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Arial, sans-serif; font-size: 11pt; }
  h1 { text-align: center; font-size: 16pt; margin: 0 0 6mm; }
  p { text-align: justify; line-height: 1.3; margin: 0 0 5mm; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 1.5mm 2mm; border-bottom: 0.3pt solid #999; }
  th { text-align: left; }
  td.num, th.num { text-align: right; }
</style>
</head>
<body>
<h1>BẢNG KÊ VẬT TƯ THÁNG 09/2026</h1>
<p>Căn cứ hợp đồng thi công số 12/2026/HĐ-XL giữa Ban quản lý dự án Cầu Rồng và Công ty Cổ phần Xây lắp Miền Trung, bên thi công lập bảng kê khối lượng vật tư đã nhập về công trường trong tháng để làm cơ sở thanh toán đợt ba theo tiến độ đã thống nhất.</p>
<table>
  <thead><tr><th>Mã</th><th>Vật tư</th><th>ĐVT</th><th class="num">Khối lượng</th><th class="num">Đơn giá</th><th class="num">Thành tiền</th></tr></thead>
  <tbody>
    <tr><td>0123</td><td>Xi măng PCB40</td><td>tấn</td><td class="num">42,5</td><td class="num">1.650.000</td><td class="num">70.125.000</td></tr>
    <tr><td>0457</td><td>Thép D16</td><td>kg</td><td class="num">12.400</td><td class="num">17.800</td><td class="num">220.720.000</td></tr>
    <tr><td>0981</td><td>Cát vàng</td><td>m3</td><td class="num">185</td><td class="num">420.000</td><td class="num">77.700.000</td></tr>
    <tr><td>1102</td><td>Đá 1x2</td><td>m3</td><td class="num">96</td><td class="num">385.000</td><td class="num">36.960.000</td></tr>
  </tbody>
</table>
</body>
</html>`
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
fs.writeFileSync(FIX + 'bang-ke.html', HTML)
await page.goto('file:///' + FIX + 'bang-ke.html')
await page.pdf({ path: FIX + 'bang-ke.pdf', format: 'A4', preferCSSPageSize: true })
await browser.close()
console.log('ok')
