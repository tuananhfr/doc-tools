// Tệp mẫu nền: hợp đồng / phụ lục / bản vẽ in từ HTML, ảnh thường, ảnh EXIF xoay,
// PNG trong suốt, ảnh khai khổ khổng lồ, tệp giả PDF, trang /Rotate + CropBox + CTM lệch.
import fs from 'node:fs'
import zlib from 'node:zlib'
import { PDFDocument, StandardFonts, concatTransformationMatrix, degrees, rgb } from 'pdf-lib'
import { chromium, FIX } from '../lib/qa.mjs'

fs.mkdirSync(FIX, { recursive: true })

const VI = 'Tiếng Việt: Ở đây có đầy đủ dấu — ắ ằ ẳ ẵ ặ ấ ầ ẩ ẫ ậ ế ề ể ễ ệ ố ồ ổ ỗ ộ ớ ờ ở ỡ ợ ứ ừ ử ữ ự đ Đ'
const CSS = `<style>
body{margin:0;font-family:Arial,sans-serif}
.p{height:100vh;box-sizing:border-box;padding:48px;page-break-after:always;border:6px solid #1f4e79;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
.no{font-size:180px;font-weight:bold;color:#1f4e79;line-height:1}
h1{font-size:32px;margin:12px 0}
.vi{font-size:18px;max-width:80%}
@page{size:A4 portrait;margin:0}
@page wide{size:A3 landscape;margin:0}
.wide{page:wide;border-color:#8a4b08}.wide .no{color:#8a4b08}
</style>`
const section = (n, title, note, cls = '') =>
  `<section class="p ${cls}"><div class="no">${n}</div><h1>${title}</h1><p>${note}</p><p class="vi">${VI}</p></section>`
const range = (count) => Array.from({ length: count }, (_, i) => i + 1)
const html = (sections) => `<!doctype html><html lang="vi"><meta charset="utf-8">${CSS}${sections.join('')}</html>`

const docs = {
  'hop-dong': range(12).map((i) => section(i, `Hợp đồng thi công — trang ${i}/12`, 'Gói thầu XL-03 · Nhà điều hành dự án Cầu Rồng')),
  // Bản 2 của hợp đồng cho "So sánh tài liệu": khác đúng hai dòng, ở trang 3 và trang 7.
  'hop-dong-v2': range(12).map((i) =>
    section(i, `Hợp đồng thi công — trang ${i}/12${i === 7 ? ' (sửa đổi)' : ''}`, i === 3 ? 'Gói thầu XL-04 · Nhà điều hành dự án Cầu Rồng' : 'Gói thầu XL-03 · Nhà điều hành dự án Cầu Rồng'),
  ),
  'ban-ve': range(3).map((i) => section(i, `Bản vẽ kết cấu A3 ngang — tờ ${i}/3`, `KC-0${i} · Móng cọc khoan nhồi D1000`, 'wide')),
  'phu-luc': range(5).map((i) => section(i, `Phụ lục lẫn khổ — trang ${i}/5`, 'Trang 3 là A3 ngang, còn lại A4', i === 3 ? 'wide' : '')),
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
for (const [name, sections] of Object.entries(docs)) {
  fs.writeFileSync(FIX + `${name}.html`, html(sections))
  await page.goto('file:///' + FIX + `${name}.html`)
  // preferCSSPageSize: khổ lấy từ @page (A4 dọc, A3 ngang) như lệnh in của Chrome.
  fs.writeFileSync(FIX + `${name}.pdf`, await page.pdf({ preferCSSPageSize: true, printBackground: true }))
}

const images = await page.evaluate(async () => {
  const encode = async (canvas, type) => {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, type, 0.9))
    return [...new Uint8Array(await blob.arrayBuffer())]
  }
  const canvas = (w, h) => Object.assign(document.createElement('canvas'), { width: w, height: h })

  // Ảnh "hiện trường": dải màu + lưới, đủ chi tiết để nén có tác dụng.
  const photo = canvas(1600, 1200)
  let g = photo.getContext('2d')
  const colors = ['#c0c0c0', '#c0c000', '#00c0c0', '#00c000', '#c000c0', '#c00000', '#0000c0']
  colors.forEach((color, i) => {
    g.fillStyle = color
    g.fillRect((i * 1600) / colors.length, 0, 1600 / colors.length + 1, 1200)
  })
  g.strokeStyle = 'rgba(0,0,0,0.35)'
  for (let x = 0; x < 1600; x += 40) g.strokeRect(x, 0, 40, 1200)
  for (let y = 0; y < 1200; y += 40) g.strokeRect(0, y, 1600, 40)

  // Ảnh ngang sẽ gắn EXIF Orientation=6: hiển thị đúng phải là ảnh đứng.
  const sideways = canvas(1600, 1200)
  g = sideways.getContext('2d')
  colors.forEach((color, i) => {
    g.fillStyle = color
    g.fillRect((i * 1600) / colors.length, 0, 1600 / colors.length + 1, 1200)
  })
  g.fillStyle = '#000'
  g.fillRect(30, 30, 1000, 110)
  g.fillStyle = '#fff'
  g.font = 'bold 80px Arial'
  g.fillText('EXIF 6 - phai dung doc', 40, 115)

  const transparent = canvas(800, 600)
  g = transparent.getContext('2d')
  g.fillStyle = 'rgba(138,75,8,0.9)'
  g.fillRect(100, 100, 600, 400)

  return { photo: await encode(photo, 'image/jpeg'), sideways: await encode(sideways, 'image/jpeg'), transparent: await encode(transparent, 'image/png') }
})
await browser.close()

fs.writeFileSync(FIX + 'anh-hien-truong.jpg', Buffer.from(images.photo))
fs.writeFileSync(FIX + 'so-do-trong-suot.png', Buffer.from(images.transparent))

// APP1 Exif tối thiểu: một mục IFD Orientation (0x0112) = 6, chèn ngay sau SOI.
const jpeg = Buffer.from(images.sideways)
const tiff = Buffer.from([0x49, 0x49, 0x2a, 0, 8, 0, 0, 0, 1, 0, 0x12, 1, 3, 0, 1, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0])
const payload = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff])
const app1 = Buffer.concat([Buffer.from([0xff, 0xe1]), Buffer.from([(payload.length + 2) >> 8, (payload.length + 2) & 0xff]), payload])
fs.writeFileSync(FIX + 'anh-exif6.jpg', Buffer.concat([jpeg.subarray(0, 2), app1, jpeg.subarray(2)]))

// PNG khai 20000×15000 (300 MP) nhưng dữ liệu cụt: phải bị chặn từ header, trước khi giải mã.
const chunk = (type, data) => {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([Buffer.from(type), data])))
  return Buffer.concat([length, Buffer.from(type), data, crc])
}
const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(20000, 0)
ihdr.writeUInt32BE(15000, 4)
ihdr.set([8, 2, 0, 0, 0], 8)
fs.writeFileSync(
  FIX + 'anh-khong-lo.png',
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(Buffer.alloc(100))), chunk('IEND', Buffer.alloc(0))]),
)

fs.writeFileSync(FIX + 'gia-mao.pdf', Buffer.from('MZ\x90\x00 day khong phai PDF', 'binary'))

// Ba trang khó: /Rotate 90, CropBox lệch gốc, CTM không bọc q/Q để lại cho nội dung chèn sau.
const odd = await PDFDocument.create()
const font = await odd.embedFont(StandardFonts.Helvetica)
const p1 = odd.addPage([595, 842])
p1.setRotation(degrees(90))
p1.drawText('ROTATE 90 - top of unrotated page', { x: 40, y: 800, size: 18, font })
p1.drawRectangle({ x: 10, y: 10, width: 575, height: 822, borderColor: rgb(0, 0, 1), borderWidth: 2 })
const p2 = odd.addPage([595, 842])
p2.setCropBox(50, 60, 400, 500)
p2.drawRectangle({ x: 50, y: 60, width: 400, height: 500, borderColor: rgb(1, 0, 0), borderWidth: 3 })
p2.drawText('CROPBOX 50,60 400x500', { x: 70, y: 520, size: 16, font })
const p3 = odd.addPage([595, 842])
p3.pushOperators(concatTransformationMatrix(1, 0, 0, 1, 200, 200))
p3.drawText('UNBALANCED CTM shifted +200,+200', { x: 20, y: 20, size: 16, font })
fs.writeFileSync(FIX + 'xoay-crop.pdf', await odd.save())

console.log('base: hop-dong, hop-dong-v2, ban-ve, phu-luc, anh-hien-truong, anh-exif6, so-do-trong-suot, anh-khong-lo, gia-mao, xoay-crop')
