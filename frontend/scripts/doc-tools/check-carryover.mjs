import fs from 'node:fs'
import { inspect } from './lib/inspect-pdf.mjs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('carryover')
const TAG = process.env.TAG ?? 'run'

const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, acceptDownloads: true, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles(['ho-so-form.pdf', 'co-annot.pdf', 'dinh-kem.pdf', 'lop.pdf'].map((name) => FIX + name))
await page.locator('.erp-doc-page').nth(7).waitFor()
await page.waitForTimeout(1500)
const shot = (name) => page.screenshot({ path: `${OUT}${TAG}-${theme}-${vw}-${name}.png` })
const toasts = async () => (await page.locator('.toast, [role=status], [role=alert]').allInnerTexts()).join(' | ')
await shot('loaded')
const loadToasts = await toasts()

// Bỏ trang 3 của co-annot (trang 5 toàn tài liệu) → liên kết "Xem trang 3" mất đích.
await page.locator('.erp-doc-page__select').nth(4).click()
await page.getByRole('button', { name: 'Xoá', exact: true }).click()
// Nhân bản trang form → hai bản cùng tên trường.
await page.locator('.erp-doc-page__select').nth(0).click()
await page.getByRole('button', { name: 'Nhân bản', exact: true }).click()
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${TAG}-${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)
await page.waitForTimeout(800)
const exportToasts = await toasts()
await shot('exported')
const report = await inspect(fs.readFileSync(pdfPath))

// Nạp lại: trang form + trang layer phải trông như bản gốc.
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
const confirm = page.getByRole('button', { name: 'Gỡ hết' })
if (await confirm.count()) await confirm.first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles(pdfPath)
await page.locator('.erp-doc-page').first().waitFor()
await page.waitForTimeout(1500)
for (const n of [1, 8]) {
  await page.getByRole('button', { name: `Xem to trang ${n}` }).click()
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1200)
  await shot(`reimport-p${n}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

console.log(JSON.stringify({ theme, vw, loadToasts, exportToasts, report, errors }, null, 1))
await browser.close()
