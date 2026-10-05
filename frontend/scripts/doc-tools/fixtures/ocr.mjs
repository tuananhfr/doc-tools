import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX } from '../lib/qa.mjs'
const { PDFDocument, degrees } = createRequire(import.meta.url)('pdf-lib')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
// A4 ở 96 px/in = 794 × 1123; hệ số 2,6 ≈ 250 DPI như máy scan văn phòng.
const page = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2.6 })
await page.goto('file:///' + FIX + 'bang-ke.html')
await page.addStyleTag({ content: 'body{margin:76px}' })
const jpg = await page.screenshot({ type: 'jpeg', quality: 80 })
fs.writeFileSync(FIX + 'anh-van-ban.jpg', jpg)
await browser.close()

const doc = await PDFDocument.create()
const image = await doc.embedJpg(jpg)
const A4 = [595.28, 841.89]
doc.addPage(A4).drawImage(image, { x: 0, y: 0, width: A4[0], height: A4[1] })
// Trang ngang, ảnh xoay 90° ngược chiều kim đồng hồ: người dùng phải bấm "Xoay phải" mới đọc được.
const landscape = doc.addPage([A4[1], A4[0]])
landscape.drawImage(image, { x: A4[1], y: 0, width: A4[0], height: A4[1], rotate: degrees(90) })
fs.writeFileSync(FIX + 'scan-van-ban.pdf', await doc.save())
console.log('ok', jpg.length)
