import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chromium, outDir } from './lib/qa.mjs'
import { generateBenchmarkFixtures } from './fixtures/ocr-benchmark.mjs'
import { normalizeOcrText, textMetrics, fieldMetrics, aggregateMetrics } from './lib/ocr-metrics.mjs'

const site = (process.env.SITE ?? 'http://localhost:3012').replace(/\/$/, '')
const out = outDir('ocr-benchmark')
const directory = process.env.OCR_FIXTURES ?? outDir('ocr-fixtures')
if (!fs.existsSync(path.join(directory, 'manifest.json'))) await generateBenchmarkFixtures(directory)
const manifestBytes = fs.readFileSync(path.join(directory, 'manifest.json'))
const manifest = JSON.parse(manifestBytes)
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
await context.route('**/api/v1/tools/**', route => route.fulfill({ json: { ok: true, total: 0 } }))
const page = await context.newPage()
page.on('dialog', dialog => void dialog.accept())
const errors = []; const unexpectedWrites = []
page.on('pageerror', error => errors.push(String(error)))
context.on('request', request => {
  if (['GET', 'HEAD'].includes(request.method())) return
  const url = new URL(request.url())
  try {
    const body = JSON.parse(request.postData() ?? '{}')
    if (url.origin === new URL(site).origin && url.pathname.endsWith('/api/v1/tools/visits') && Object.keys(body).length === 1 && typeof body.tool === 'string') return
  } catch { /* Invalid counter bodies must fail the privacy check. */ }
  unexpectedWrites.push(url.pathname)
})
const report = { version: 1, createdAt: new Date().toISOString(), target: site, actor: 'anonymous Free user', browser: browser.version(), viewport: '1440x900',
  fixtureManifestSha256: sha256(manifestBytes), fixtureReviewStatus: manifest.reviewStatus, cases: [],
  limitations: [...manifest.missingCoverage, 'UI-only raw word/confidence observation; no internal bbox export', 'Automated confirmation keeps raw OCR values; not a human correction-time measurement', 'No product accuracy threshold or release approval is inferred'] }
try {
  await page.goto(site + '/', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async () => (await (await fetch('offline-manifest.json')).json()).version)
  const modelBytes = await page.evaluate(async url => {
    const response = await fetch(url)
    if (!response.ok) throw new Error('Language model unavailable')
    return Array.from(new Uint8Array(await response.arrayBuffer()))
  }, site + '/vendor/tesseract/vie.traineddata.gz')
  report.engine = { name: 'Tesseract.js', mode: 'Vietnamese LSTM; UI-selected default comparison passes', languageModelSha256: sha256(Buffer.from(modelBytes)),
    versionEvidence: 'Served build ID and language asset hash; library version is not inferred from the working tree' }
  for (const fixture of manifest.cases.filter(item => !process.env.ONLY || process.env.ONLY.split(',').includes(item.id))) {
    const result = { id: fixture.id, tags: fixture.tags, expectedText: fixture.expectedText, inputSha256: fixture.sha256, fields: [], words: [] }
    const started = Date.now()
    try {
      const input = path.join(directory, fixture.file)
      assert.equal(sha256(fs.readFileSync(input)), fixture.sha256, 'Fixture changed after generation')
      // `/` is the landing page; tool search lives on `/cong-cu`.
      await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' })
      await page.locator('#tim-cong-cu').fill('Lấy chữ từ ảnh')
      await page.locator('.erp-tools-grid .erp-tool-card').filter({ hasText: 'Lấy chữ từ ảnh' }).click()
      await page.locator('input[type=file]').first().setInputFiles(input)
      const recognitionStarted = Date.now()
      await page.locator('.erp-flow__run').click()
      await page.locator('.cn-ocr-review, .erp-flow-error').first().waitFor({ timeout: 120000 })
      result.recognitionMs = Date.now() - recognitionStarted
      if (await page.locator('.erp-flow-error').count()) {
        result.engineMessage = await page.locator('.erp-flow-error').innerText()
        assert.match(result.engineMessage, /không đọc được chữ nào/i)
        result.rawText = ''; result.status = 'measured-no-text'; result.exportStatus = 'no-text'
      } else {
        const required = await page.locator('.cn-ocr-review__word.needs-review').count()
        result.reviewRequiredWords = required
        if (required) assert(await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).isDisabled())
        const buttons = page.locator('.cn-ocr-review__word')
        for (let i = 0; i < await buttons.count(); i++) {
          await buttons.nth(i).click()
          const rawText = await page.locator('.cn-ocr-review__raw strong').innerText()
          const label = await page.locator('.cn-ocr-review__raw + p').innerText()
          const confidence = Number(label.match(/(\d+)\/100/)?.[1] ?? NaN)
          assert(Number.isFinite(confidence) && confidence >= 0 && confidence <= 100, 'Confidence is absent or invalid')
          result.words.push({ index: i, rawText, confidence, requiresReview: (await buttons.nth(i).getAttribute('class')).includes('needs-review') })
        }
        result.rawText = result.words.map(word => word.rawText).join(' ')
        await buttons.first().click()
        await page.locator('.cn-ocr-review__editor').scrollIntoViewIfNeeded()
        await page.screenshot({ path: path.join(out, fixture.id + '-review.png') })
        let confirmations = 0
        while (await page.locator('.cn-ocr-review__word.needs-review').count()) {
          assert(confirmations++ < 250, 'Review did not advance')
          await page.locator('.cn-ocr-review__word.needs-review').first().click()
          await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
        }
        await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
        const pending = page.waitForEvent('download')
        await page.getByRole('button', { name: 'Tải về', exact: true }).click()
        const download = await pending
        const output = path.join(out, fixture.id + '.txt'); await download.saveAs(output)
        const text = new TextDecoder('utf-8', { fatal: true }).decode(fs.readFileSync(output))
        assert.equal(normalizeOcrText(text), normalizeOcrText(result.rawText), 'Export differs from observed unchanged OCR')
        result.exportSha256 = sha256(fs.readFileSync(output)); result.exportStatus = 'passed'; result.status = 'measured'
      }
      result.metrics = textMetrics(fixture.expectedText, result.rawText)
      result.fields = fieldMetrics(fixture.fields, result.rawText)
    } catch (error) {
      result.status = 'runner-failed'; result.error = String(error); result.url = page.url()
      await page.screenshot({ path: path.join(out, fixture.id + '-failure.png') }).catch(() => {})
    }
    result.totalAutomatedMs = Date.now() - started
    report.cases.push(result)
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
    console.log(JSON.stringify({ id: result.id, status: result.status, cer: result.metrics?.cer, fields: result.fields.filter(field => field.exact).length + '/' + result.fields.length }))
  }
  const finalBuild = await page.evaluate(async url => (await (await fetch(url)).json()).version, site + '/offline-manifest.json')
  assert.equal(finalBuild, report.build, 'Served build changed during benchmark')
  assert(report.cases.length > 0, 'No cases selected')
  assert.equal(errors.length, 0, 'Browser runtime errors')
  assert.equal(unexpectedWrites.length, 0, 'Unexpected writes')
  report.summary = aggregateMetrics(report.cases)
  report.status = report.cases.some(item => item.status === 'runner-failed') ? 'runner-failed' : 'baseline-measured'
  if (report.status === 'runner-failed') process.exitCode = 1
} catch (error) { report.status = 'runner-failed'; report.error = String(error); process.exitCode = 1 }
finally {
  report.errors = errors; report.unexpectedWrites = unexpectedWrites
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ status: report.status, summary: report.summary, error: report.error, report: path.join(out, 'results.json') }))
  await browser.close()
}
