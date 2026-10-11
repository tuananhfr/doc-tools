import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { unzipSync, strFromU8 } from 'fflate'
import ExcelJS from 'exceljs'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { chromium, outDir, mockFreeSession } from './lib/qa.mjs'
import { structuredMetrics } from './lib/ocr-metrics.mjs'

const site = process.env.SITE ?? 'http://localhost:37062', out = outDir('ocr-tables')
const fixtures = process.env.OCR_FIXTURES
assert(fixtures, 'Preserved OCR fixtures required')
const manifestFile = path.join(fixtures, 'manifest.json'), manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
await mockFreeSession(context)
const page = await context.newPage()
const report = { createdAt: new Date().toISOString(), target: site, build: null, fixtureManifestSha256: hash(fs.readFileSync(manifestFile)), cases: [], errors: [], limitations: ['Synthetic fixtures and scripted ground-truth corrections', 'No handwriting or human correction-time measurement', 'Raw proposals are scored separately from corrected exports'] }
page.on('pageerror', error => report.errors.push(String(error)))
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
const values = fixture => fixture.groundTruth.cells.filter(cell => cell.text).map(cell => cell.text)
async function validate(bytes, format, fixture) {
  if (format === 'json') {
    const result = JSON.parse(bytes.toString('utf8')), table = result.pages[0].layout.tables[0]
    assert.equal(table.rows, fixture.groundTruth.rows); assert.equal(table.columns, fixture.groundTruth.columns)
    const metrics = structuredMetrics(fixture.groundTruth.cells, table.cells.map(cell => ({ ...cell, text: cell.verified?.value })), ['row', 'column'])
    assert.equal(metrics.correct, metrics.total); assert.equal(metrics.extra, 0)
    assert(result.pages[0].words.every(word => !(word.contentType === 'numeric' || word.reviewReasons?.length) || word.verifiedValue !== null))
    assert(result.pages[0].sourceHash)
    assert(result.pages[0].pipeline.passes.every(pass => pass.toOriginal.every(Number.isFinite)))
    return { cells: metrics.correct, provenance: true }
  }
  if (format === 'xlsx') {
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(bytes)
    const sheet = workbook.worksheets[0]
    for (const cell of fixture.groundTruth.cells) {
      const actual = sheet.getCell(cell.row + 1, cell.column + 1)
      assert.equal(actual.value ?? '', cell.text)
      assert.equal(actual.isMerged, (cell.rowSpan ?? 1) > 1 || (cell.columnSpan ?? 1) > 1)
      if (/^0\d/u.test(cell.text)) assert.equal(typeof actual.value, 'string')
    }
    return { cells: fixture.groundTruth.cells.length, leadingZeroAndMergedCells: true }
  }
  let text
  if (format === 'docx') {
    text = strFromU8(unzipSync(bytes)['word/document.xml'])
    assert(text.includes('<w:tbl>')); assert(text.includes('w:gridSpan'))
    if (fixture.id === 'GRID-ROWSPAN') assert(text.includes('w:vMerge'))
  } else if (format === 'pdf') {
    const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise
    try { assert.equal(document.numPages, 1); text = (await (await document.getPage(1)).getTextContent()).items.map(item => item.str).join(' ') }
    finally { await document.loadingTask.destroy() }
  } else text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  for (const value of values(fixture)) assert(text.includes(value), `Missing ${value} in ${format}`)
  if (format === 'csv') assert(text.includes("'0012"))
  return { allReviewedValuesPresent: true }
}
try {
  for (const fixture of manifest.cases.filter(item => !process.env.ONLY || process.env.ONLY.split(',').includes(item.id))) {
    assert.equal(hash(fs.readFileSync(path.join(fixtures, fixture.file))), fixture.sha256)
    for (const format of ['json', 'xlsx', 'csv', 'text', 'docx', 'pdf']) {
      const result = { id: fixture.id, format, inputSha256: fixture.sha256 }
      try {
        await page.goto(site + '/anh-sang-van-ban', { waitUntil: 'networkidle' })
        const build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
        assert(!report.build || report.build === build); report.build = build
        if (process.env.EXPECTED_BUILD) assert.equal(build, process.env.EXPECTED_BUILD)
        await page.getByLabel('Loại nội dung', { exact: true }).selectOption('table')
        await page.getByLabel('Định dạng tải về', { exact: true }).selectOption(format)
        await page.locator('input[type=file]').first().setInputFiles(path.join(fixtures, fixture.file))
        await page.locator('.erp-flow__run').click(); await page.locator('.cn-ocr-review').waitFor({ timeout: 120000 })
        const proposal = await page.locator('.cn-ocr-table td').evaluateAll(cells => cells.map(cell => {
          const input = cell.querySelector('input'), match = input.getAttribute('aria-label').match(/Hàng (\d+), cột (\d+)/)
          return { row: Number(match[1]) - 1, column: Number(match[2]) - 1, rowSpan: cell.rowSpan, columnSpan: cell.colSpan, text: input.value }
        }))
        result.proposedMetrics = structuredMetrics(fixture.groundTruth.cells, proposal, ['row', 'column'])
        for (const cell of fixture.groundTruth.cells) {
          const input = page.getByLabel(`Hàng ${cell.row + 1}, cột ${cell.column + 1}`, { exact: true })
          assert.equal(await input.count(), 1, 'Automatic grid structure differs from truth')
          const td = input.locator('..')
          assert.equal(Number(await td.getAttribute('rowspan') ?? 1), cell.rowSpan ?? 1)
          assert.equal(Number(await td.getAttribute('colspan') ?? 1), cell.columnSpan ?? 1)
          await input.fill(cell.text)
        }
        await page.getByRole('button', { name: 'Tôi đã đối chiếu bảng với ảnh gốc', exact: true }).click()
        for (let count = 0; await page.locator('.cn-ocr-review__word.needs-review').count(); count++) {
          assert(count < 300)
          await page.locator('.cn-ocr-review__word.needs-review').first().click()
          await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
        }
        await page.getByRole('button', { name: 'Tôi đã đối chiếu bảng với ảnh gốc', exact: true }).click()
        await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
        await page.locator('.erp-flow-result').waitFor({ timeout: 120000 })
        const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Tải về', exact: true }).click()
        const file = path.join(out, fixture.id + '.' + (format === 'text' ? 'txt' : format)); await (await pending).saveAs(file)
        const bytes = fs.readFileSync(file)
        result.validation = await validate(bytes, format, fixture); result.sha256 = hash(bytes); result.status = 'passed'
      } catch (error) { result.status = 'failed'; result.error = String(error); await page.screenshot({ path: path.join(out, fixture.id + '-' + format + '-failure.png') }).catch(() => undefined) }
      report.cases.push(result); save()
      console.log(JSON.stringify({ id: fixture.id, format, status: result.status, error: result.error }))
    }
  }
  assert(report.cases.length > 0); assert.equal(report.errors.length, 0)
  report.status = report.cases.every(item => item.status === 'passed') ? 'passed' : 'failed'
  if (report.status === 'failed') process.exitCode = 1
} catch (error) { report.status = 'failed'; report.error = String(error); process.exitCode = 1 }
finally { save(); await browser.close() }
