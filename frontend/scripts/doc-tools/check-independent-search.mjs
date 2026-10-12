import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium, outDir } from './lib/qa.mjs'

const site = process.env.SITE ?? 'http://localhost:3002'
const out = outDir('independent-search')
const source = JSON.parse(fs.readFileSync(new URL('../../qa-output/2026-10-11-baseline/chuyen-nho-qa-20261011/exploratory/results-reviewed.json', import.meta.url), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await context.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, user: null, plan: { pro: false }, total: 0 } }))
const page = await context.newPage()
const report = { reviewStatus: 'draft', build: null, cases: [], errors: [], limitations: ['Existing independent candidate queries replayed as regression cases', 'Not a new blinded holdout or human-approved ground truth'] }
page.on('pageerror', error => report.errors.push(String(error)))
try {
  await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  for (const item of source.cases) {
    await page.locator('#tim-cong-cu').fill(item.query)
    await page.waitForTimeout(100)
    const actual = await page.locator('a.erp-tool-card').evaluateAll(elements => elements.map(element => new URL(element.href).pathname.replace(/^\//, '').split('?')[0]))
    const passed = item.expected ? actual[0] === item.expected : actual.length === 0
    report.cases.push({ query: item.query, expected: item.expected, actual, status: passed ? 'passed' : 'failed' })
    if (!passed) await page.screenshot({ path: path.join(out, `failed-${report.cases.length}.png`) })
  }
  report.status = report.cases.every(item => item.status === 'passed') && !report.errors.length ? 'passed' : 'failed'
  assert.equal(report.status, 'passed')
} catch (error) { report.status = 'failed'; report.error = String(error); process.exitCode = 1 }
finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2), 'utf8'); await browser.close() }
console.log(JSON.stringify({ status: report.status, cases: report.cases.length, failed: report.cases.filter(item => item.status === 'failed') }))
