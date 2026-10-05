import fs from 'node:fs'
import { inspect } from './lib/inspect-pdf.mjs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('password')
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
const requests = []
page.on('request', (r) => r.url().includes('qpdf') && requests.push(r.url().split('/').pop()))
const checks = {}
const shot = (name) => page.screenshot({ path: `${OUT}${TAG}-${theme}-${vw}-${name}.png` })
const dialog = page.getByRole('dialog')
const title = () => dialog.locator('.modal-title').innerText()
const pageCount = () => page.locator('.erp-doc-page').count()

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles(['ma-hoa-trong.pdf', 'mat-khau.pdf', 'han-che.pdf'].map((name) => FIX + name))
await dialog.waitFor({ timeout: 20000 })
await page.waitForTimeout(500)
checks.firstTitle = await title()
checks.pagesBehindModal = await pageCount()
await shot('ask-open')

await dialog.getByLabel('Mật khẩu', { exact: true }).fill('sai')
await dialog.getByRole('button', { name: 'Mở khoá' }).click()
await dialog.locator('.invalid-feedback').waitFor()
checks.wrong = await dialog.locator('.invalid-feedback').innerText()
await shot('wrong')

await dialog.getByLabel('Mật khẩu', { exact: true }).fill('Mật-khẩu-2026')
await dialog.getByRole('button', { name: 'Mở khoá' }).click()
await page.getByText('Tệp bị khoá quyền sửa').waitFor({ timeout: 15000 })
checks.secondTitle = await title()
await shot('ask-owner')
await dialog.getByRole('button', { name: 'Bỏ qua tệp này' }).click()
await dialog.waitFor({ state: 'detached' })
await page.waitForTimeout(800)
checks.pagesAfter = await pageCount()

// Mật khẩu mở đúng nhưng tệp cấm sửa → phải đòi mật khẩu chủ, không tự gỡ.
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
const confirm = page.getByRole('button', { name: 'Gỡ hết' })
if (await confirm.count()) await confirm.first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles(FIX + 'mo-han-che.pdf')
await dialog.waitFor({ timeout: 20000 })
await dialog.getByLabel('Mật khẩu', { exact: true }).fill('mo123')
await dialog.getByRole('button', { name: 'Mở khoá' }).click()
await page.getByText('Tệp bị khoá quyền sửa').waitFor({ timeout: 15000 })
checks.restricted = await dialog.locator('.invalid-feedback').innerText()
await shot('restricted')
await dialog.getByLabel('Mật khẩu chủ').fill('chu456')
await dialog.getByRole('button', { name: 'Mở khoá' }).click()
await dialog.waitFor({ state: 'detached', timeout: 15000 })
await page.locator('.erp-doc-page').nth(1).waitFor()
await page.waitForTimeout(800)
checks.ownerUnlockedPages = await pageCount()
checks.formTab = await page.getByRole('tab', { name: /Điền form/ }).count()

const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${TAG}-${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)
const report = await inspect(fs.readFileSync(pdfPath))
checks.export = { pages: report.pageCount, fields: report.fields.length, unit: report.fields[0]?.value }
await shot('done')

console.log(JSON.stringify({ theme, vw, checks, requests: [...new Set(requests)], errors }, null, 1))
await browser.close()
