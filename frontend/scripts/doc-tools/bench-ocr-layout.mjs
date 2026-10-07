import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chromium, outDir } from './lib/qa.mjs'
import { structuredMetrics } from './lib/ocr-metrics.mjs'

const site = process.env.SITE ?? 'http://localhost:3016', out = outDir('ocr-layout')
const fixtures = process.env.OCR_FIXTURES ?? path.join(process.env.LOCALAPPDATA, 'Temp/erpcons-doc-tools/out/ocr-fixtures-v2')
const manifest = JSON.parse(fs.readFileSync(path.join(fixtures, 'manifest.json'), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } }), page = await context.newPage()
const errors = []; page.on('pageerror', error => errors.push(String(error)))
await context.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, total: 0 } }))
const report = { target: site, kind: 'raw table proposals before correction', cases: [], errors, limitations: ['Synthetic fixtures with generated ground truth', 'No region or bbox accuracy measurement', 'Review-screen time is not human correction time', 'Geometric proposals require manual confirmation'] }
try {
  await page.goto(site + '/', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  for (const fixture of manifest.cases) {
    const file = path.join(fixtures, fixture.file), bytes = fs.readFileSync(file)
    assert.equal(createHash('sha256').update(bytes).digest('hex'), fixture.sha256)
    await page.goto(site + '/anh-sang-van-ban', { waitUntil: 'networkidle' })
    await page.getByLabel('Loại nội dung', { exact: true }).selectOption('table')
    await page.locator('input[type=file]').first().setInputFiles(file)
    const started = Date.now(); await page.locator('.erp-flow__run').click()
    await page.locator('.cn-ocr-review, .erp-flow-error').first().waitFor({ timeout: 120000 })
    const proposal = await page.locator('.cn-ocr-table td').evaluateAll(cells => cells.map(cell => {
      const input = cell.querySelector('input'), match = input.getAttribute('aria-label').match(/Hàng (\d+), cột (\d+)/)
      return { row: Number(match[1])-1, column: Number(match[2])-1, rowSpan: cell.rowSpan, columnSpan: cell.colSpan, text: input.value }
    }))
    const metrics = structuredMetrics(fixture.groundTruth.cells, proposal, ['row','column'])
    report.cases.push({ id: fixture.id, inputSha256: fixture.sha256, reviewScreenMs: Date.now()-started, metrics, proposal })
    console.log(JSON.stringify({ id: fixture.id, correct: metrics.correct, total: metrics.total, extra: metrics.extra }))
    await page.screenshot({ path: path.join(out, fixture.id + '-review.png') })
  }
  assert.equal(errors.length, 0)
  report.status = 'baseline-measured'
} catch (error) { report.status = 'runner-failed'; report.error = String(error); process.exitCode = 1 }
finally {
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
  await browser.close()
}
