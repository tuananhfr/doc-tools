import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX } from '../lib/qa.mjs'
const { PDFDocument, StandardFonts } = createRequire(import.meta.url)('pdf-lib')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
// Ảnh giả scan: nền giấy + chữ + nhiễu hạt — JPEG chất lượng cao để có cái mà nén.
const images = await page.evaluate(async () => {
  async function make(w, h, seed, type, quality) {
    const c = document.createElement('canvas'); c.width = w; c.height = h
    const x = c.getContext('2d')
    const g = x.createLinearGradient(0, 0, w, h); g.addColorStop(0, `hsl(${seed * 40},30%,92%)`); g.addColorStop(1, `hsl(${seed * 40 + 20},25%,80%)`)
    x.fillStyle = g; x.fillRect(0, 0, w, h)
    x.fillStyle = '#223'; x.font = `${Math.round(w / 30)}px serif`
    for (let i = 0; i < 40; i++) x.fillText(`Dòng ${i + 1} — Biên bản nghiệm thu khối lượng hạng mục ${seed}`, w * 0.06, h * 0.06 + i * h * 0.022)
    const d = x.getImageData(0, 0, w, h); let s = seed * 9973
    for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) & 0x7fffffff; const n = (s % 40) - 20; d.data[i] += n; d.data[i + 1] += n; d.data[i + 2] += n }
    x.putImageData(d, 0, 0)
    const blob = await new Promise((r) => c.toBlob(r, type, quality))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  }
  return { a: await make(2480, 3508, 1, 'image/jpeg', 0.95), b: await make(2480, 3508, 2, 'image/jpeg', 0.95), png: await make(600, 400, 3, 'image/png') }
})
await browser.close()

const doc = await PDFDocument.create()
const font = await doc.embedFont(StandardFonts.Helvetica)
for (const key of ['a', 'b']) {
  const img = await doc.embedJpg(Uint8Array.from(images[key]))
  const p = doc.addPage([595.28, 841.89])
  p.drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 })
}
const png = await doc.embedPng(Uint8Array.from(images.png))
const p = doc.addPage([595.28, 841.89])
p.drawText('Trang so do PNG', { x: 50, y: 780, size: 20, font })
p.drawImage(png, { x: 50, y: 300, width: 480, height: 320 })
const bytes = await doc.save()
fs.writeFileSync(FIX + 'ho-so-scan.pdf', bytes)
console.log('scan.pdf', bytes.length, 'jpeg', images.a.length, images.b.length, 'png', images.png.length)
