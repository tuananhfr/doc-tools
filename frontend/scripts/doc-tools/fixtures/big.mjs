import { createRequire } from 'node:module'
import fs from 'node:fs'
import { FIX } from '../lib/qa.mjs'
const { PDFDocument, StandardFonts, rgb } = createRequire(import.meta.url)('pdf-lib')

const big = await PDFDocument.create()
const font = await big.embedFont(StandardFonts.Helvetica)
for (let i = 1; i <= 500; i++) {
  const p = big.addPage([595.28, 841.89])
  p.drawText(`Ho so du thau - trang ${i}/500`, { x: 60, y: 780, size: 18, font })
  for (let l = 0; l < 30; l++) p.drawText(`Dong ${l + 1}: khoi luong hang muc ${i}.${l} - don gia ${1000 + i * l}`, { x: 60, y: 740 - l * 22, size: 10, font })
}
fs.writeFileSync(FIX + 'ho-so-500-trang.pdf', await big.save())

// Bản vẽ khổ lớn: A0 / A1 xen kẽ, nhiều nét vector như bản vẽ kết cấu.
const dwg = await PDFDocument.create()
const f2 = await dwg.embedFont(StandardFonts.Helvetica)
for (let i = 1; i <= 100; i++) {
  const [w, h] = i % 2 ? [3370.39, 2383.94] : [2383.94, 1683.78]
  const p = dwg.addPage([w, h])
  for (let k = 0; k < 400; k++) {
    const x = (k * 97) % w
    const y = (k * 53) % h
    p.drawLine({ start: { x, y }, end: { x: (x + 300) % w, y: (y + 170) % h }, thickness: 0.6, color: rgb(0, 0, 0) })
  }
  p.drawRectangle({ x: w - 620, y: 20, width: 600, height: 180, borderWidth: 2, borderColor: rgb(0, 0, 0) })
  p.drawText(`BAN VE KC-${String(i).padStart(3, '0')}  ${i % 2 ? 'A0' : 'A1'}`, { x: w - 600, y: 150, size: 36, font: f2 })
}
fs.writeFileSync(FIX + 'ban-ve-a0-100.pdf', await dwg.save())
// Tệp hỏng: cắt đôi; tệp rỗng; JPEG hỏng.
const whole = fs.readFileSync(FIX + 'hop-dong.pdf')
fs.writeFileSync(FIX + 'cut-doi.pdf', whole.subarray(0, Math.floor(whole.length / 2)))
fs.writeFileSync(FIX + 'rong.pdf', Buffer.alloc(0))
const jpg = fs.readFileSync(FIX + 'anh-hien-truong.jpg')
fs.writeFileSync(FIX + 'anh-hong.jpg', jpg.subarray(0, 600))
for (const n of ['ho-so-500-trang.pdf', 'ban-ve-a0-100.pdf']) console.log(n, fs.statSync(FIX + n).size)
