import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'
const appRequire = createRequire(import.meta.url)
const { unzipSync } = appRequire('fflate')
const { PDFDocument } = appRequire('pdf-lib')
const OUT = outDir('limits')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
const errors = []
const downloads = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
page.on('dialog', (d) => d.accept())
page.on('download', (d) => downloads.push(d.suggestedFilename()))
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })

// 1. Ảnh khai 300 triệu điểm ảnh bị chặn từ header, trước khi giải mã.
await page.locator('input[type=file]').first().setInputFiles([FIX + 'anh-khong-lo.png', FIX + 'ho-so-500-trang.pdf'])
await page.locator('.erp-doc-page').nth(499).waitFor({ state: 'attached', timeout: 120000 })
out.rejected = (await page.getByText(/Bỏ qua 1 tệp/).locator('..').allInnerTexts()).join(' | ').replace(/\s+/g, ' ')

// 2. Xuất ảnh 500 trang rồi huỷ giữa chừng: không tệp nào được tải.
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
await page.getByRole('button', { name: /^Tải 500 ảnh/ }).click()
const status = page.locator('.erp-doc-export__status')
await status.waitFor({ timeout: 10000 })
await page.waitForTimeout(2500)
out.statusText = await status.innerText()
await shot('export-status')
await status.getByRole('button', { name: 'Huỷ' }).click()
await page.getByText('Đã huỷ xuất — chưa tải tệp nào.').waitFor({ timeout: 15000 })
await page.waitForTimeout(1500)
out.afterCancel = { statusGone: (await status.count()) === 0, downloads: downloads.length }
// Huỷ xong vẫn xuất lại được bình thường.
const [pdfDl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: /^Tải PDF/ }).click()])
await pdfDl.saveAs(OUT + `${theme}-${vw}-500.pdf`)
out.pdfPages = (await PDFDocument.load(fs.readFileSync(OUT + `${theme}-${vw}-500.pdf`))).getPageCount()

// 3. Bản vẽ A0/A1 ở 300 DPI: ảnh bị hạ trần và app nói ra.
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'ban-ve-a0-100.pdf'])
await page.locator('.erp-doc-page').nth(99).waitFor({ state: 'attached', timeout: 120000 })
await page.locator('.erp-doc-page__select').nth(0).click()
await page.locator('.erp-doc-page__select').nth(1).click()
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
await page.getByRole('radio', { name: /Trang đã chọn/ }).check()
await page.getByLabel('Độ phân giải').selectOption('300')
const [zipDl] = await Promise.all([page.waitForEvent('download', { timeout: 300000 }), page.getByRole('button', { name: /^Tải 2 ảnh/ }).click()])
await zipDl.saveAs(OUT + `${theme}-${vw}-a0.zip`)
const zip = unzipSync(fs.readFileSync(OUT + `${theme}-${vw}-a0.zip`))
out.zipNames = Object.keys(zip)
const toast = page.getByText(/khổ lớn chỉ xuất được/)
await toast.waitFor({ timeout: 10000 })
out.dpiToast = await toast.innerText()
await shot('dpi-toast')

out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
