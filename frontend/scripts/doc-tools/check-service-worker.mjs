import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir } from './lib/qa.mjs'
const { PDFDocument } = createRequire(import.meta.url)('pdf-lib')
const OUT = outDir('service-worker')
const BASE = process.env.BASE ?? 'http://localhost:4173/erpcons/doc-tools/chinh-sua-pdf'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
const chunks = new Set()
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
page.on('dialog', (d) => d.accept())
context.on('request', (r) => { const m = r.url().match(/(fontkit|docx-lib|exceljs|tesseract-core|\/worker\.min|vie\.traineddata)[^/]*$/); if (m) chunks.add(m[0]) })
const out = {}
const failed = []
context.on('response', (r) => r.status() >= 400 && failed.push(r.status() + ' ' + r.url()))
await page.goto(BASE)
await page.locator('.erp-doc-drop__title').waitFor({ timeout: 30000 })
out.sw = await page.evaluate(async () => {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 15000))])
  return reg ? reg.active?.state ?? 'no-active' : 'none'
})
// Nạp lại để trang chạy dưới quyền SW.
await page.reload()
await page.locator('.erp-doc-drop__title').waitFor({ timeout: 30000 })
out.controlled = await page.evaluate(() => !!navigator.serviceWorker.controller)
await page.locator('input[type=file]').first().setInputFiles([FIX + 'scan-van-ban.pdf', FIX + 'hop-dong.pdf'])
await page.locator('.erp-doc-page').nth(13).waitFor({ state: 'attached', timeout: 60000 })

// fontkit: bật số trang rồi xuất PDF.
await page.getByRole('tab', { name: /Số trang/ }).click()
await page.getByLabel(/Đánh số trang|Số trang/).first().check().catch(async () => { await page.locator('.erp-doc-export input[type=checkbox]').first().check() })
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [pdf] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: /^Tải PDF/ }).click()])
await pdf.saveAs(OUT + 'sw.pdf')
out.pdfPages = (await PDFDocument.load(fs.readFileSync(OUT + 'sw.pdf'))).getPageCount()

// docx.
const [word] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: 'Tải Word' }).click()])
await word.saveAs(OUT + 'sw.docx')
out.docxBytes = fs.statSync(OUT + 'sw.docx').size

// OCR trên trang scan đầu.
await page.locator('.erp-doc-page__select').nth(0).click()
await page.getByRole('tab', { name: 'Tìm' }).click()
await page.getByRole('button', { name: /Nhận dạng chữ \(OCR\)/ }).click()
const toast = page.getByText(/Đã nhận dạng \d+ trang|Không nhận dạng được/)
await toast.waitFor({ timeout: 180000 })
out.ocr = await toast.innerText()
out.chunks = [...chunks].sort()
out.failed = failed
out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
