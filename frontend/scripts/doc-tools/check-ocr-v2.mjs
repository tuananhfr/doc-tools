import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { unzipSync, strFromU8 } from 'fflate'
import ExcelJS from 'exceljs'
import { PDFDocument } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { chromium, outDir } from './lib/qa.mjs'
import { structuredMetrics } from './lib/ocr-metrics.mjs'

const site = process.env.SITE ?? 'http://localhost:3016'
const fixtures = process.env.OCR_FIXTURES ?? path.join(process.env.LOCALAPPDATA, 'Temp/erpcons-doc-tools/out/ocr-fixtures-v2')
const out = outDir('ocr-v2'), hash = bytes => createHash('sha256').update(bytes).digest('hex')
const manifest = JSON.parse(fs.readFileSync(path.join(fixtures, 'manifest.json'), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
await context.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, total: 0, tools: {} } }))
const page = await context.newPage(), errors = [], writes = []
page.on('pageerror', error => errors.push(String(error)))
context.on('request', request => {
  if (request.method() !== 'POST') return
  const url = new URL(request.url()), body = JSON.parse(request.postData() ?? '{}')
  if (url.origin !== new URL(site).origin || !url.pathname.endsWith('/api/v1/tools/visits') || Object.keys(body).length !== 1 || typeof body.tool !== 'string') writes.push(url.pathname)
})
const report = { target: site, actor: 'anonymous Free user', kind: 'automated fixture review, not a human accuracy measurement', cases: [], rawTableMetrics: null, errors, writes }
async function confirmWords() {
  let count = 0
  while (await page.locator('.cn-ocr-review__word.needs-review').count()) {
    assert(count++ < 300, 'Review loop did not finish')
    await page.locator('.cn-ocr-review__word.needs-review').first().click()
    await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
  }
  return count
}
async function discover() {
  await page.goto(site + '/', { waitUntil: 'networkidle' })
  await page.locator('#cn-home-search').fill('Lấy chữ từ ảnh')
  await page.locator('#erp-tools-grid .erp-tool-card').filter({ hasText: 'Lấy chữ từ ảnh' }).click()
}
try {
  await discover()
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  for (const format of ['text', 'pdf', 'docx', 'json', 'xlsx', 'csv']) {
    const table = ['xlsx', 'csv'].includes(format)
    await discover()
    await page.getByLabel('Loại nội dung', { exact: true }).selectOption(table ? 'table' : 'printed')
    await page.getByLabel('Định dạng tải về', { exact: true }).selectOption(format)
    const file = table ? path.join(fixtures, 'GRID-CLEAN.png') : path.join(fixtures, 'baseline-v1/RECEIPT-CLEAN.png')
    await page.locator('input[type=file]').first().setInputFiles(file)
    await page.locator('.erp-flow__run').click()
    await page.locator('.cn-ocr-review').waitFor({ timeout: 120000 })
    assert(await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).isDisabled())
    await page.getByRole('button', { name: 'Hoàn tác lần sửa gần nhất', exact: true }).isDisabled()
    if (!table) {
      await page.locator('.cn-ocr-review__word').filter({ hasText: /^1250000\s/ }).click()
      await page.locator('#ocr-word-value').fill('1280000')
      await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
      await page.getByRole('button', { name: 'Hoàn tác lần sửa gần nhất', exact: true }).click()
      assert(await page.locator('.cn-ocr-review__word').filter({ hasText: /^1250000\s/ }).count())
      await page.locator('.cn-ocr-review__word').filter({ hasText: /^1250000\s/ }).click()
      await page.locator('#ocr-word-value').fill('1280000')
      await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
      await confirmWords()
    } else {
      const truth = manifest.cases.find(item => item.id === 'GRID-CLEAN').groundTruth.cells
      const raw = await page.locator('.cn-ocr-table td').evaluateAll(cells => cells.map(cell => {
        const input = cell.querySelector('input'), label = input.getAttribute('aria-label'), match = label.match(/Hàng (\d+), cột (\d+)/)
        return { row: Number(match[1]) - 1, column: Number(match[2]) - 1, rowSpan: cell.rowSpan, columnSpan: cell.colSpan, text: input.value }
      }))
      report.rawTableMetrics = structuredMetrics(truth, raw, ['row', 'column'])
      await page.locator('.cn-ocr-table__size input').nth(0).fill('6')
      await page.locator('.cn-ocr-table__size input').nth(1).fill('4')
      for (const cell of truth) {
        const input = page.getByLabel(`Hàng ${cell.row + 1}, cột ${cell.column + 1}`, { exact: true })
        assert.equal(await input.count(), 1, 'Detected grid has incorrect structure; manual correction needs a separate journey')
        await input.fill(cell.text)
      }
      await page.getByRole('button', { name: 'Tôi đã đối chiếu bảng với ảnh gốc', exact: true }).click()
      await confirmWords()
      // Confirm the grid after any word-level changes invalidate its verification.
      await page.getByRole('button', { name: 'Tôi đã đối chiếu bảng với ảnh gốc', exact: true }).click()
    }
    for (const width of [1440, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 900 })
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `Overflow at ${width}`)
      await page.locator(table ? '.cn-ocr-table' : '.cn-ocr-review__editor').scrollIntoViewIfNeeded()
      await page.screenshot({ path: path.join(out, `${format}-review-${width}.png`) })
    }
    await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
    await page.locator('.erp-flow-result').waitFor({ timeout: 120000 })
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Tải về', exact: true }).click()
    const download = await pending, filename = path.join(out, `reviewed.${format === 'text' ? 'txt' : format}`)
    await download.saveAs(filename)
    const bytes = fs.readFileSync(filename)
    if (format === 'text') assert(new TextDecoder('utf-8', { fatal: true }).decode(bytes).includes('1280000'))
    if (format === 'json') {
      const data = JSON.parse(bytes.toString('utf8'))
      assert.equal(data.schemaVersion, 2)
      assert(data.pages[0].words.some(word => word.rawText === '1250000' && word.verifiedValue === '1280000'))
      assert.equal(data.pages[0].pipeline.passes.length, 2)
      const critical = data.pages[0].words.filter(word => word.contentType === 'numeric' || word.reviewReasons?.length)
      const verified = critical.filter(word => word.verifiedValue !== null).length
      report.criticalReview = { required: critical.length, verified, coverage: verified / critical.length }
      assert(critical.length > 0 && verified === critical.length)
    }
    if (format === 'docx') assert(strFromU8(unzipSync(bytes)['word/document.xml']).includes('1280000'))
    if (format === 'pdf') {
      assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1)
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise
      try { const text = (await (await pdf.getPage(1)).getTextContent()).items.map(item => item.str).join(' '); assert(text.includes('1280000')); assert(!text.includes('1250000')) }
      finally { await pdf.loadingTask.destroy() }
    }
    if (format === 'csv') { assert(bytes.toString('utf8').includes("'0012")); assert(bytes.toString('utf8').includes('180.000')) }
    if (format === 'xlsx') {
      const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes)
      const sheet = workbook.worksheets[0]
      assert.equal(sheet.getCell('A3').value, '0012'); assert.equal(sheet.getCell('D5').value, '180.000')
      assert.equal(sheet.getCell('B1').value, 'BẢNG KÊ VẬT TƯ')
      assert(sheet.getCell('B1').isMerged)
    }
    report.cases.push({ format, status: 'passed', bytes: bytes.length, sha256: hash(bytes) })
    console.log(JSON.stringify(report.cases.at(-1)))
  }
  assert.equal(errors.length, 0); assert.equal(writes.length, 0)
  assert.equal(await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version), report.build)
  report.status = 'passed'
} catch (error) {
  report.status = 'failed'; report.error = String(error); report.visible = (await page.locator('body').innerText()).slice(-2500)
  await page.screenshot({ path: path.join(out, 'failure.png') }).catch(() => undefined)
  process.exitCode = 1
} finally {
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ status: report.status, error: report.error, report: path.join(out, 'results.json') }))
  await browser.close()
}
