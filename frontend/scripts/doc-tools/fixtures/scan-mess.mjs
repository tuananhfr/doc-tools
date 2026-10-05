// Fixture A6: bản scan nghiêng / trắng / có viền tối + ảnh chụp tờ giấy trên bàn.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX } from '../lib/qa.mjs'
const { PDFDocument, degrees } = createRequire(import.meta.url)('pdf-lib')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const images = await page.evaluate(async () => {
  // w×h = ảnh; paper = tỉ lệ tờ giấy trong ảnh (1 = kín ảnh); tilt = độ nghiêng xuôi kim đồng hồ; lines = số dòng chữ.
  async function make({ w, h, tilt = 0, paper = 1, lines = 34, dust = 0, background = 70, seed = 1 }) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const x = c.getContext('2d')
    x.fillStyle = paper < 1 ? `rgb(${background},${background - 6},${background - 12})` : '#f2f0ea'
    x.fillRect(0, 0, w, h)
    x.save()
    x.translate(w / 2, h / 2)
    x.rotate((tilt * Math.PI) / 180)
    const pw = w * paper
    const ph = h * paper
    x.fillStyle = '#f2f0ea'
    x.fillRect(-pw / 2, -ph / 2, pw, ph)
    x.fillStyle = '#1d1f2a'
    const size = Math.round(pw / 42)
    x.font = `${size}px serif`
    const fit = Math.min(lines, Math.floor((ph * 0.84) / (size * 1.9)))
    for (let i = 0; i < fit; i++) {
      x.fillText(`Dòng ${i + 1} — Biên bản nghiệm thu khối lượng hạng mục móng cọc khoan nhồi D1000`, -pw / 2 + pw * 0.08, -ph / 2 + ph * 0.08 + i * size * 1.9)
    }
    x.restore()
    const d = x.getImageData(0, 0, w, h)
    let s = seed * 9973
    for (let i = 0; i < d.data.length; i += 4) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      const n = (s % 24) - 12
      d.data[i] += n
      d.data[i + 1] += n
      d.data[i + 2] += n
    }
    for (let k = 0; k < dust; k++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff
      const p = (s % (w * h)) * 4
      d.data[p] = d.data[p + 1] = d.data[p + 2] = 30
    }
    x.putImageData(d, 0, 0)
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  }
  const A4 = { w: 1240, h: 1754 }
  return {
    straight: await make({ ...A4, seed: 1 }),
    tilted: await make({ ...A4, tilt: 2.5, seed: 2 }),
    blank: await make({ ...A4, lines: 0, dust: 300, seed: 3 }),
    bordered: await make({ ...A4, tilt: -1.8, paper: 0.86, seed: 4 }),
    sparse: await make({ ...A4, lines: 3, seed: 5 }),
    rotated: await make({ ...A4, tilt: 2, seed: 6 }),
    photo: await make({ w: 1600, h: 2000, tilt: 3, paper: 0.78, background: 55, seed: 7 }),
  }
})
await browser.close()

const doc = await PDFDocument.create()
for (const key of ['straight', 'tilted', 'blank', 'bordered', 'sparse']) {
  const img = await doc.embedJpg(Uint8Array.from(images[key]))
  doc.addPage([595.28, 841.89]).drawImage(img, { x: 0, y: 0, width: 595.28, height: 841.89 })
}
// Trang ngang có /Rotate 90: nội dung vẽ xoay ngược 90° để HIỆN ra dọc, chữ nghiêng 2°.
const rotatedImg = await doc.embedJpg(Uint8Array.from(images.rotated))
const sideways = doc.addPage([841.89, 595.28])
sideways.drawImage(rotatedImg, { x: 841.89, y: 0, width: 595.28, height: 841.89, rotate: degrees(90) })
sideways.setRotation(degrees(90))
fs.writeFileSync(FIX + 'scan-lon-xon.pdf', await doc.save())
fs.writeFileSync(FIX + 'anh-chup-giay.jpg', Uint8Array.from(images.photo))
console.log('ok')
