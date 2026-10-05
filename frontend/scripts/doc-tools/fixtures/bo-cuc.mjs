import fs from 'node:fs'
import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, StandardFonts, clip, endPath, popGraphicsState, pushGraphicsState, rectangle, rgb } from 'pdf-lib'
import { chromium, FIX } from '../lib/qa.mjs'

// Các bố cục khó của Sửa chữ viết lại trang: bảng kẻ viền đủ bốn phía (viền dọc phải dài theo hàng),
// trang hai cột (cột bên kia không được bị đẩy), trang đầy chữ có chân trang (tràn thì sang trang mới),
// bảng kiểu Word có vùng cắt riêng cho từng ô (dời chữ mà quên vùng cắt là chữ biến mất),
// vùng hai cột THẤP rồi tới đoạn trải cả trang (vẫn là hai cột) và bảng không viền có ô nhiều dòng (không phải hai cột).
// Hai tệp cuối dựng tay, mỗi dòng một đối tượng chữ như Word / LibreOffice: Chrome ghi từng KÝ TỰ một đối tượng nên
// không đối tượng nào vắt ngang khe cột, đoạn trải cả trang không khép được vùng hai cột.
const HEAD = `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.35; margin: 0; }
  h1 { font-size: 15pt; margin: 0 0 5mm; }
  p { margin: 0 0 4mm; }
  table { border-collapse: collapse; width: 100%; }
  th, td { padding: 1.5mm 2mm; border: 0.75pt solid #333; text-align: left; vertical-align: top; }
  th { background: #dde6ee; }
  .hai-cot { column-count: 2; column-gap: 10mm; text-align: left; }
  .chan { position: fixed; bottom: 0; left: 0; right: 0; text-align: center; font-size: 9pt; }
</style>
</head>
<body>`

const CAU = [
  'Nhà thầu chịu trách nhiệm kiểm tra cao độ, tim trục và kích thước hình học trước khi mời tư vấn giám sát nghiệm thu.',
  'Mọi sai lệch vượt dung sai cho phép phải được lập biên bản và có biện pháp khắc phục kèm thời hạn cụ thể.',
  'Vật liệu đưa vào công trình phải có chứng chỉ xuất xưởng và kết quả thí nghiệm còn hiệu lực.',
  'Nhật ký thi công ghi đủ nhân lực, thiết bị, thời tiết và khối lượng thực hiện trong ngày.',
]
const doan = (count, from = 0) => Array.from({ length: count }, (_, index) => `<p>${index + 1 + from}. ${CAU[(index + from) % CAU.length]}</p>`).join('\n')

const PAGES = {
  'bang-vien': `<h1>BẢNG PHÂN CÔNG NGHIỆM THU</h1>
<table>
  <thead><tr><th>Mã</th><th>Hạng mục</th><th>Phụ trách</th><th>Hạn</th></tr></thead>
  <tbody>
    <tr><td>M-01</td><td>Móng trụ T3</td><td>Tổ bê tông số 2</td><td>12/10</td></tr>
    <tr><td>M-02</td><td>Dầm ngang nhịp 4</td><td>Tổ cốt thép</td><td>18/10</td></tr>
    <tr><td>M-03</td><td>Lan can cầu</td><td>Tổ hoàn thiện</td><td>25/10</td></tr>
  </tbody>
</table>
<p style="margin-top: 6mm">Bảng này thay cho bản phát hành ngày 01/10.</p>`,
  'hai-cot': `<h1>QUY ĐỊNH CHUNG TẠI CÔNG TRƯỜNG</h1>
<div class="hai-cot">
${doan(16)}
</div>
<p class="chan">Ban quản lý dự án Cầu Rồng — trang 1</p>`,
  'day-trang': `<h1>ĐIỀU KHOẢN NGHIỆM THU VÀ THANH TOÁN</h1>
${doan(19)}
<p class="chan">Ban quản lý dự án Cầu Rồng — trang 1</p>`,
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
for (const [name, body] of Object.entries(PAGES)) {
  fs.writeFileSync(`${FIX}${name}.html`, `${HEAD}\n${body}\n</body>\n</html>`)
  await page.goto(`file:///${FIX}${name}.html`)
  await page.pdf({ path: `${FIX}${name}.pdf`, format: 'A4', preferCSSPageSize: true, printBackground: true })
}
await browser.close()

// Chrome không bao giờ sinh vùng cắt theo ô nên bảng này dựng tay: nền + chữ của mỗi ô nằm trong `q … re W n … Q`.
const doc = await PDFDocument.create()
const font = await doc.embedFont(StandardFonts.Helvetica)
const sheet = doc.addPage([595.28, 841.89])
const COLS = [60, 200, 400, 535]
const ROW = 22
const TOP = 720
const LINE = rgb(0.2, 0.2, 0.2)
const ROWS = [
  ['Ma', 'Hang muc', 'Phu trach'],
  ['C-01', 'Mong tru T3', 'To be tong so 2'],
  ['C-02', 'Dam ngang nhip 4', 'To cot thep'],
  ['C-03', 'Lan can cau', 'To hoan thien'],
]
sheet.drawText('BANG CO VUNG CAT TUNG O', { x: 60, y: 760, size: 14, font })
sheet.drawRectangle({ x: 60, y: TOP - 0.25, width: 475, height: 0.5, color: LINE })
ROWS.forEach((cells, row) => {
  const y = TOP - (row + 1) * ROW
  cells.forEach((text, column) => {
    const x = COLS[column]
    const width = COLS[column + 1] - x
    sheet.pushOperators(pushGraphicsState(), rectangle(x, y, width, ROW), clip(), endPath())
    sheet.drawRectangle({ x, y, width, height: ROW, color: row % 2 ? rgb(1, 1, 1) : rgb(0.9, 0.93, 0.96) })
    sheet.drawText(text, { x: x + 5, y: y + 7, size: 11, font })
    sheet.pushOperators(popGraphicsState())
  })
  for (const x of COLS) sheet.drawRectangle({ x: x - 0.25, y, width: 0.5, height: ROW, color: LINE })
  sheet.drawRectangle({ x: 60, y: y - 0.25, width: 475, height: 0.5, color: LINE })
})
sheet.drawText('Dong duoi bang van phai con nguyen.', { x: 60, y: TOP - ROWS.length * ROW - 24, size: 11, font })
fs.writeFileSync(`${FIX}bang-cat.pdf`, await doc.save())
console.log('ok')

const TEXT = fs.readFileSync(new URL('../../../src/assets/fonts/BeVietnamPro-Regular.ttf', import.meta.url))
const SIZE = 11
const PITCH = 15

/** Trang A4 trống + hàm xếp một đoạn văn vào bề rộng `width`, trả về chân chữ của dòng cuối. */
async function typeset(title) {
  const pdf = await PDFDocument.create()
  pdf.registerFontkit(fontkit)
  const face = await pdf.embedFont(TEXT, { subset: false })
  const paper = pdf.addPage([595.28, 841.89])
  paper.drawText(title, { x: 57, y: 770, size: 15, font: face })
  const paragraph = (text, x, y, width) => {
    let line = ''
    let base = y + PITCH
    const flush = () => {
      base -= PITCH
      paper.drawText(line, { x, y: base, size: SIZE, font: face })
    }
    for (const word of text.split(' ')) {
      if (line && face.widthOfTextAtSize(`${line} ${word}`, SIZE) > width) {
        flush()
        line = word
      } else {
        line = line ? `${line} ${word}` : word
      }
    }
    flush()
    return base
  }
  return { pdf, paper, face, paragraph }
}

{
  // Đoạn hai cột dài ngắn khác nhau: câu nào cũng xếp vừa ba dòng, hai cột cùng dãy câu thì đoạn nào cũng mở đầu ngang
  // hàng với đoạn bên kia, trông y như bảng không viền.
  const { pdf, paper, face, paragraph } = await typeset('QUY ĐỊNH NGHIỆM THU')
  const column = (texts, from, x) => texts.reduce((y, text, index) => paragraph(`${index + 1 + from}. ${text}`, x, y, 226) - PITCH - SIZE, 740) + PITCH + SIZE
  const bottom = Math.min(column(CAU, 0, 57), column([`${CAU[2]} ${CAU[3]}`, CAU[0], `${CAU[1]} ${CAU[2]}`], 4, 312))
  paragraph('Hai bên cam kết thực hiện đúng các quy định nêu trên và chịu trách nhiệm trước pháp luật về nội dung đã ký kết trong biên bản này.', 57, bottom - PITCH - SIZE, 481)
  paper.drawText('Ban quản lý dự án Cầu Rồng — trang 1', { x: 218, y: 70, size: 9, font: face })
  fs.writeFileSync(`${FIX}hai-cot-ngan.pdf`, await pdf.save())
}

{
  const { pdf, paragraph } = await typeset('PHÂN CÔNG TRÁCH NHIỆM')
  let y = 740
  for (const at of [0, 1, 2, 3]) {
    const left = paragraph(`Tổ ${at + 1}: ${CAU[at]}`, 57, y, 226)
    const right = paragraph(`Việc ${at + 1}: ${CAU[(at + 2) % 4]}${at % 2 ? '' : ` ${CAU[1]}`}`, 312, y, 226)
    y = Math.min(left, right) - PITCH - 8
  }
  // Dòng kết ngắn hơn ô bảng: dài tới sát khe giữa hai ô thì chính nó làm khe ấy không còn là khe.
  paragraph('Bảng có hiệu lực từ ngày ký.', 57, y - SIZE, 481)
  fs.writeFileSync(`${FIX}bang-khong-vien.pdf`, await pdf.save())
}
