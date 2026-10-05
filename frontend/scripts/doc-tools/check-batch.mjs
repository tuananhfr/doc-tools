import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument } = appRequire('pdf-lib')
const { unzipSync, strFromU8 } = appRequire('fflate')

const OUT = outDir('batch')
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
const dialog = page.getByRole('dialog')

async function download(click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), click()])
  const path = OUT + `${theme}-${vw}-${dl.suggestedFilename()}`
  await dl.saveAs(path)
  return { path, name: dl.suggestedFilename() }
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

// Dọn scan trước: trang chỉnh nghiêng / cắt viền thành nguồn dẫn xuất — vẫn phải về đúng tệp gốc.
await page.getByRole('button', { name: 'Dọn scan' }).click()
await dialog.waitFor()
await dialog.locator('.erp-doc-scan__progress').waitFor({ state: 'detached', timeout: 120000 })
await dialog.getByRole('button', { name: /Áp dụng/ }).click()
await dialog.waitFor({ state: 'detached', timeout: 120000 })
await page.waitForTimeout(1200)
checks.pages = await page.locator('.erp-doc-page').count()

const section = page.locator('.erp-doc-export__section', { hasText: 'Xử lý từng tệp riêng' })
await section.scrollIntoViewIfNeeded()
checks.note = (await section.locator('.erp-doc-export__note').innerText()).slice(0, 40)
const button = section.getByRole('button', { name: /Xuất \d+ tệp/ })
checks.button = await button.innerText()
await page.screenshot({ path: `${OUT}${theme}-${vw}-section.png` })

const pdfZip = await download(() => button.click())
const pdfFiles = unzipSync(fs.readFileSync(pdfZip.path))
checks.pdfZip = { name: pdfZip.name, files: {} }
for (const [name, bytes] of Object.entries(pdfFiles)) checks.pdfZip.files[name] = (await PDFDocument.load(bytes)).getPageCount()

await section.getByRole('combobox').selectOption('word')
const wordZip = await download(() => button.click())
const wordFiles = unzipSync(fs.readFileSync(wordZip.path))
checks.wordZip = Object.fromEntries(
  Object.entries(wordFiles).map(([name, bytes]) => {
    const xml = strFromU8(unzipSync(bytes)['word/document.xml'])
    return [name, { sections: xml.split('<w:sectPr').length - 1, contract: xml.includes('Hợp đồng thi công') }]
  }),
)

await section.getByRole('combobox').selectOption('image')
checks.imageHint = await section.locator('.erp-doc-export__hint').innerText()
const imageZip = await download(() => button.click())
const imageNames = Object.keys(unzipSync(fs.readFileSync(imageZip.path)))
checks.imageZip = { count: imageNames.length, first: imageNames.slice(0, 3), last: imageNames.at(-1) }
await page.screenshot({ path: `${OUT}${theme}-${vw}-after.png` })

// Chọn trang của một tệp → chỉ còn một nhóm: mục hàng loạt tự ẩn.
await page.locator('.erp-doc-page__select').first().click()
await page.getByRole('radio', { name: /Trang đã chọn/ }).check()
await page.waitForTimeout(300)
checks.hiddenForOneFile = (await section.count()) === 0

console.log(JSON.stringify({ theme, vw, checks, errors }, null, 1))
await browser.close()
