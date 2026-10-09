import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { chromium, outDir } from './lib/qa.mjs'

const require = createRequire(import.meta.url)
const { PDFDocument } = require('pdf-lib')
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const site = (process.env.SITE ?? 'http://localhost:3012').replace(/\/$/, '')
const out = outDir('free-search-ocr')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
const writes = []
page.on('pageerror', error => errors.push(String(error)))
page.on('request', request => {
  if (request.method() !== 'GET' && request.method() !== 'HEAD') writes.push({ path: new URL(request.url()).pathname, body: request.postData() })
})
await context.route('**/api/v1/tools/**', route => route.fulfill({ json: { ok: true, total: 0 } }))
const report = { target: site, actor: 'anonymous Free user', environment: 'local production preview', counterApi: 'mocked', viewports: [], checks: [], limitations: ['Synthetic printed Vietnamese fixture; real handwriting and physical phones are not covered'] }

// `/` is the landing page; search and the category directory both live on `/cong-cu`.
async function home() { await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' }) }
async function find(query, slug) {
  await home()
  await page.locator('#tim-cong-cu').fill(query)
  await page.waitForFunction(expected => document.querySelector('.erp-tools-grid .erp-tool-card')?.getAttribute('href') === expected, '/' + slug)
  await page.locator('.erp-tools-grid .erp-tool-card').first().click()
  await page.waitForURL('**/' + slug)
  await page.locator('input[type=file]').first().waitFor({ state: 'attached' })
}
async function capture(name) {
  const geometry = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth, title: document.title }))
  assert(geometry.scroll <= geometry.client + 1, `Horizontal overflow: ${name}`)
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true })
  report.viewports.push({ name, ...geometry })
}
async function review() {
  await page.getByRole('heading', { name: 'Kiểm tra chữ đã nhận dạng', exact: true }).waitFor({ timeout: 120000 })
  await page.locator('.cn-ocr-review__preview canvas:not([hidden])').waitFor()
}
async function confirmRemaining() {
  for (let count = 0; await page.locator('.cn-ocr-review__word.needs-review').count(); count++) {
    assert(count < 200, 'Review did not advance')
    await page.locator('.cn-ocr-review__word.needs-review').first().click()
    await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
  }
  await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
  await page.getByRole('button', { name: 'Tải về', exact: true }).waitFor({ timeout: 90000 })
}
async function download(name) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Tải về', exact: true }).click()
  const file = await pending
  const destination = path.join(out, name)
  await file.saveAs(destination)
  return destination
}
async function changeMoney() {
  const word = page.locator('.cn-ocr-review__word').filter({ hasText: /^1250000\s/ })
  assert.equal(await word.count(), 1, 'Money fixture was not recognized as expected')
  await word.click()
  await page.locator('#ocr-word-value').fill('1280000')
  await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
  assert.equal(await page.locator('.cn-ocr-review__word.is-verified').filter({ hasText: /^1280000\s/ }).count(), 1)
}
async function correctName() {
  const word = page.locator('.cn-ocr-review__word').filter({ hasText: /^Nguy[êễ]n\s/ })
  assert.equal(await word.count(), 1, 'Name fixture region was not found')
  await word.click()
  report.recognizedName = await page.locator('#ocr-word-value').inputValue()
  await page.locator('#ocr-word-value').fill('Nguyễn')
  await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
}

try {
  const fixture = await browser.newPage({ viewport: { width: 1100, height: 600 }, deviceScaleFactor: 1 })
  await fixture.setContent('<html lang="vi"><meta charset="utf-8"><style>body{background:white;color:black;margin:60px;font:40px "Times New Roman";line-height:1.8}h1{font-size:44px}p{margin:8px 0}</style><h1>BIÊN NHẬN</h1><p>Người nhận: Nguyễn Văn An</p><p>Số tiền: 1250000 đồng</p><p>Ngày: 07/10/2026</p></html>')
  const png = await fixture.screenshot()
  await fixture.close()
  const image = path.join(out, 'synthetic-receipt.png')
  fs.writeFileSync(image, png)
  const pdf = await PDFDocument.create()
  const embedded = await pdf.embedPng(png)
  pdf.addPage([550, 300]).drawImage(embedded, { x: 0, y: 0, width: 550, height: 300 })
  const scan = path.join(out, 'synthetic-scan.pdf')
  fs.writeFileSync(scan, await pdf.save())

  await find('File nặng quá không gửi được', 'nen-pdf')
  report.checks.push('everyday need -> compress PDF')
  await find('nen pfd gui zalo', 'nen-pdf')
  report.checks.push('typo -> compress PDF')
  await home()
  await page.locator('#tim-cong-cu').fill('ghep pdf')
  await page.waitForFunction(() => document.querySelector('.erp-tools-grid .erp-tool-card')?.getAttribute('href') === '/ghep-pdf')
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 780]]) {
    await page.setViewportSize({ width, height })
    await page.locator('#tim-cong-cu').focus()
    await capture(`search-${width}`)
  }
  await page.locator('#tim-cong-cu').fill('đặt vé máy bay')
  await page.getByText('Không tìm thấy công cụ nào', { exact: true }).waitFor()
  assert.equal(await page.locator('.erp-tools-grid').count(), 0)
  report.checks.push('unsupported need -> no result')
  await page.setViewportSize({ width: 1440, height: 900 })
  await home()
  await page.getByRole('button', { name: 'Tài liệu', exact: true }).click()
  await page.locator('.erp-tool-card').filter({ hasText: 'Lấy chữ từ bản scan' }).click()
  await page.waitForURL('**/ocr-van-ban')
  report.checks.push('browse directory -> documents -> OCR')

  await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 30000 })
  assert(!await page.getByText('Tài nguyên OCR đã sẵn sàng ngoại tuyến trên thiết bị này.', { exact: true }).count())
  await context.setOffline(true)
  await page.getByRole('button', { name: 'Chuẩn bị dùng ngoại tuyến', exact: true }).click()
  await page.getByText(/Chưa chuẩn bị được/).waitFor()
  await context.setOffline(false)
  await page.getByRole('button', { name: 'Chuẩn bị dùng ngoại tuyến', exact: true }).click()
  await page.getByText('Tài nguyên OCR đã sẵn sàng ngoại tuyến trên thiết bị này.', { exact: true }).waitFor({ timeout: 60000 })
  report.checks.push('cold OCR resources -> honest failure offline -> prepare online')

  await find('Lấy chữ từ ảnh', 'anh-sang-van-ban')
  await page.locator('input[type=file]').first().setInputFiles(image)
  await page.getByRole('button', { name: 'Lấy chữ', exact: true }).click()
  await review()
  assert(await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).isDisabled())
  for (const [width, height] of [[1440, 900], [768, 1024], [390, 844], [320, 780]]) {
    await page.setViewportSize({ width, height })
    await page.locator('#ocr-review-title').scrollIntoViewIfNeeded()
    await capture(`ocr-review-${width}`)
    await page.locator('.cn-ocr-review__editor').scrollIntoViewIfNeeded()
    await page.screenshot({ path: path.join(out, `ocr-editor-${width}.png`) })
  }
  await changeMoney()
  await correctName()
  await confirmRemaining()
  const textFile = await download('reviewed-receipt.txt')
  const text = fs.readFileSync(textFile, 'utf8')
  assert(text.includes('1280000'))
  assert(!text.includes('1250000'))
  assert(text.includes('Nguyễn'))
  report.checks.push('numeric confirmation blocks export; corrected UTF-8 TXT contains edited amount')

  await page.setViewportSize({ width: 1440, height: 900 })
  await find('Lấy chữ từ bản scan', 'ocr-van-ban')
  await page.locator('input[type=file]').first().setInputFiles(scan)
  await page.getByRole('button', { name: 'Nhận dạng chữ', exact: true }).click()
  await review()
  await page.getByRole('button', { name: 'Huỷ', exact: true }).click()
  await page.getByRole('button', { name: 'Nhận dạng chữ', exact: true }).waitFor()
  assert.equal(await page.locator('.cn-ocr-review').count(), 0)
  await page.getByRole('button', { name: 'Nhận dạng chữ', exact: true }).click()
  await review()
  await changeMoney()
  await confirmRemaining()
  const pdfFile = await download('reviewed-receipt.pdf')
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfFile)), verbosity: 0 }).promise
  const content = (await (await doc.getPage(1)).getTextContent()).items.map(item => item.str).join(' ')
  assert(content.includes('1280000'))
  assert(!content.includes('1250000'))
  await doc.loadingTask.destroy()
  report.checks.push('cancel review -> retry -> searchable PDF contains corrected amount')

  await find('Lấy chữ từ ảnh', 'anh-sang-van-ban')
  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('input[type=file]').first().setInputFiles(image)
  await page.getByRole('button', { name: 'Lấy chữ', exact: true }).click()
  await review()
  await confirmRemaining()
  await download('offline-receipt.txt')
  await context.setOffline(false)
  report.checks.push('offline reload -> cached OCR -> review -> TXT download')
  assert.equal(errors.length, 0, JSON.stringify(errors))
  assert(writes.every(write => write.path.endsWith('/tools/visits') && Object.keys(JSON.parse(write.body)).every(key => key === 'tool')), 'Unexpected input write')
  report.checks.push('no file/text uploads; only mocked tool visit counters')
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'
  report.failure = String(error)
  report.url = page.url()
  report.body = (await page.locator('body').innerText()).slice(-3000)
  await page.screenshot({ path: path.join(out, 'failure.png'), fullPage: true })
  process.exitCode = 1
} finally {
  report.errors = errors
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log(JSON.stringify(report))
  await browser.close()
}
