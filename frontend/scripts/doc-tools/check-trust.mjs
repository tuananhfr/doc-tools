// Freshness scenarios (TRUST01, CN-011) on the real electricity and house-estimate pages, with the
// rules and sources APIs mocked from the backend's signed test fixtures. Run the dev server with the
// fixture key so the browser accepts the fixtures:
//   NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI=$(node -e "...see plan...") npm run dev
//   QA_OUT=qa-output node scripts/doc-tools/check-trust.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium, ORIGIN, outDir } from './lib/qa.mjs'

const fixtures = path.resolve(import.meta.dirname, '..', '..', '..', 'backend', 'tests', 'fixtures')
const legacy = JSON.parse(fs.readFileSync(path.join(fixtures, 'rule-package-legacy.json'), 'utf8'))
const withSource = JSON.parse(fs.readFileSync(path.join(fixtures, 'rule-package-source-id.json'), 'utf8'))
const OUT = outDir('trust')
const daysAgo = days => new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
const registryRow = { sourceId: 'qa-fixture-source', issuer: 'Bộ Công Thương', documentNumber: 'QA-01/2025/TT-BCT', jurisdiction: 'Toàn quốc', article: null, validFrom: '2025-01-01', validTo: null, checkedAt: daysAgo(10), evidenceUrl: 'https://example.com/qa-evidence.pdf', status: 'superseded' }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const result = { scenarios: {}, failures: [] }

async function open(slug, { rulesPackage = null, sources = null } = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN', serviceWorkers: 'block' })
  await context.route('**/api/v1/**', route => {
    const { pathname } = new URL(route.request().url())
    if (pathname.endsWith('/api/v1/rules/electricity')) return route.fulfill({ json: { ok: true, package: rulesPackage, upcoming: null } })
    if (pathname.includes('/api/v1/rules/')) return route.fulfill({ json: { ok: true, package: null, upcoming: null } })
    if (pathname.includes('/api/v1/sources/')) return sources ? route.fulfill(sources) : route.fulfill({ status: 404, json: { ok: false, code: 'SOURCE_NOT_FOUND' } })
    return route.fulfill({ json: { ok: true, user: null, plan: { pro: false, endsAt: null }, capabilities: ['tool.use'], staff: null, total: 0, tools: {} } })
  })
  const page = await context.newPage()
  await page.goto(`${ORIGIN}/${slug}`, { waitUntil: 'domcontentloaded' })
  return { context, page }
}

async function scenario(name, slug, options, check) {
  const { context, page } = await open(slug, options)
  try {
    await page.locator('.cn-freshness').waitFor({ timeout: 30000 })
    await page.waitForTimeout(500)
    const box = page.locator('.cn-freshness')
    const state = {
      freshness: await box.getAttribute('data-freshness'),
      warnings: await box.locator('[data-warning]').evaluateAll(nodes => nodes.map(node => node.getAttribute('data-warning'))),
      text: (await box.innerText()).replace(/\s+/g, ' ').slice(0, 400),
    }
    result.scenarios[name] = state
    const problem = check(state)
    if (problem) result.failures.push(`${name}: ${problem}`)
    await box.screenshot({ path: `${OUT}${name}.png` })
    return page
  } catch (error) {
    result.failures.push(`${name}: ${String(error).slice(0, 200)}`)
    await page.screenshot({ path: `${OUT}${name}-error.png` }).catch(() => {})
    return page
  } finally {
    if (name !== 'legacy') await context.close()
  }
}

// If the server runs with another signing key the page shows "invalid" and no box: setup error, not a product bug.
const probe = await open('tien-dien', { rulesPackage: legacy })
const invalid = await probe.page.getByText(/không qua bước kiểm tra/).first().isVisible({ timeout: 15000 }).catch(() => false)
await probe.context.close()
if (invalid) { console.log(JSON.stringify({ setupError: 'running server does not use the fixture signing key' })); await browser.close(); process.exit(2) }

const legacyPage = await scenario('legacy', 'tien-dien', { rulesPackage: legacy }, state =>
  state.freshness !== 'warning' ? 'expected data-freshness=warning'
    : !state.warnings.includes('stale') ? 'expected a stale warning (retrievedAt 2025-01-15)'
      : !/QA fixture/.test(state.text) ? 'package source title missing' : null)
result.scenarios.tapTargets = await legacyPage.locator('.cn-freshness a').evaluateAll(links => links.map(link => Math.round(link.getBoundingClientRect().height)))
if (result.scenarios.tapTargets.some(height => height < 44)) result.failures.push(`tapTargets: link shorter than 44px ${result.scenarios.tapTargets}`)
await legacyPage.context().close()

await scenario('sourceSuperseded', 'tien-dien', { rulesPackage: withSource, sources: { json: { ok: true, source: registryRow, staleDays: 90 } } }, state =>
  !state.text.includes('QA-01/2025/TT-BCT') ? 'registry document number missing'
    : !state.warnings.includes('superseded') ? 'expected a superseded warning'
      : state.warnings.includes('stale') ? 'checked 10 days ago must not be stale' : null)

await scenario('registryDown', 'tien-dien', { rulesPackage: withSource, sources: { status: 503, json: { ok: false } } }, state =>
  !state.warnings.includes('registry-unavailable') ? 'expected registry-unavailable notice'
    : !state.warnings.includes('stale') ? 'expected stale from the package retrievedAt' : null)

await scenario('reference', 'khai-toan-nha', {}, state =>
  state.freshness !== 'reference' || !state.warnings.includes('reference') ? 'expected the reference variant' : null)

await browser.close()
console.log(JSON.stringify(result, null, 2))
process.exit(result.failures.length ? 1 : 0)
