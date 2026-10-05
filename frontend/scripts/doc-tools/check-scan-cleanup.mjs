import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument } = appRequire('pdf-lib')

const OUT = outDir('scan-cleanup')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, acceptDownloads: true, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
const checks = {}
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const dialog = page.getByRole('dialog')
const pageCount = () => page.locator('.erp-doc-page').count()

async function download(click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), click()])
  const path = OUT + `${theme}-${vw}-${dl.suggestedFilename()}`
  await dl.saveAs(path)
  return path
}

async function runScan() {
  await page.getByRole('button', { name: 'Dọn scan' }).click()
  await dialog.waitFor()
  await dialog.locator('.erp-doc-scan__progress').waitFor({ state: 'detached', timeout: 120000 })
  await page.waitForTimeout(800)
  const sections = await dialog.locator('.erp-doc-scan__section').evaluateAll((nodes) =>
    nodes.map((node) => ({
      title: node.querySelector('h3')?.childNodes[1]?.textContent?.trim(),
      items: [...node.querySelectorAll('.erp-doc-scan__meta')].map((item) => item.textContent.replace(/\s+/g, ' ').trim()),
    })),
  )
  return { sections, empty: await dialog.locator('.erp-doc-scan__empty').count(), notes: await dialog.locator('.erp-doc-export__note').allInnerTexts() }
}

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'scan-lon-xon.pdf', FIX + 'anh-chup-giay.jpg', FIX + 'hop-dong.pdf'])
await page.locator('.erp-doc-page').nth(18).waitFor({ timeout: 60000 })
await page.waitForTimeout(1500)
checks.pagesBefore = await pageCount()

const started = Date.now()
checks.first = await runScan()
checks.scanMs = Date.now() - started
checks.applyLabel = await dialog.getByRole('button', { name: /Áp dụng|Chưa chọn/ }).innerText()
await shot('results')
await dialog.locator('.modal-body').evaluate((node) => node.scrollTo(0, node.scrollHeight))
await shot('results-bottom')

await dialog.getByRole('button', { name: /Áp dụng/ }).click()
await dialog.waitFor({ state: 'detached', timeout: 120000 })
checks.toast = await page.getByText(/Đã bỏ|Đã sửa|Không sửa/).first().innerText()
await page.waitForTimeout(1500)
checks.pagesAfter = await pageCount()
checks.origins = await page.locator('.erp-doc-page__origin').evaluateAll((nodes) => nodes.slice(0, 7).map((node) => node.textContent))
await shot('grid')

// Soi lại ngay: đã thẳng, đã hết viền → không còn gì để sửa.
checks.second = await runScan()
await dialog.getByRole('button', { name: 'Đóng' }).first().click()
await dialog.waitFor({ state: 'detached' })

// Hoàn tác cả lô một bước.
await page.keyboard.press('Control+z')
await page.waitForTimeout(800)
checks.pagesUndo = await pageCount()
await page.keyboard.press('Control+y')
await page.waitForTimeout(800)
checks.pagesRedo = await pageCount()

const pdfPath = await download(() => page.getByRole('button', { name: /Tải PDF/ }).click())
const doc = await PDFDocument.load(fs.readFileSync(pdfPath))
checks.export = { pages: doc.getPageCount(), sizes: doc.getPages().slice(0, 7).map((p) => { const s = p.getSize(); return `${Math.round(s.width)}x${Math.round(s.height)}@${p.getRotation().angle}` }) }

// Nạp lại tệp đã xuất (chỉ phần scan): soi lại không còn gì.
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
const confirm = page.getByRole('button', { name: 'Gỡ hết' })
if (await confirm.count()) await confirm.first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles([pdfPath])
await page.locator('.erp-doc-page').nth(checks.export.pages - 1).waitFor({ timeout: 60000 })
await page.waitForTimeout(1500)
// Chọn 6 trang scan đầu (sau đó là hợp đồng có lớp chữ).
await page.locator('.erp-doc-page__select').first().click()
await page.locator('.erp-doc-page__select').nth(5).click({ modifiers: ['Shift'] })
checks.reimport = await runScan()
await shot('reimport')

console.log(JSON.stringify({ theme, vw, checks, errors }, null, 1))
await browser.close()
