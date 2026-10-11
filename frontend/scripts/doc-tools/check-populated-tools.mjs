import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium, FIX, outDir } from './lib/qa.mjs'
import { buildToolCatalog } from '../export-tool-catalog.mjs'

const site = process.env.SITE ?? 'http://localhost:37061'
const out = outDir('populated-tools')
const deferred = new Set(['ocr', 'image-to-text', 'pdf-to-excel'])
const catalog = await buildToolCatalog()
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
await context.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, user: null, plan: { pro: false }, capabilities: ['tool.use'], total: 0, tools: {} } }))
const page = await context.newPage()
page.setDefaultTimeout(10000)
page.on('dialog', dialog => void dialog.accept())
const report = { build: null, tools: [], errors: [], limitations: ['Populated-state smoke checks supplement output validators; arbitrary input is not a correctness oracle', 'OCR processing deferred; specialized media, model and hardware inputs require separate checks'] }
page.on('pageerror', error => report.errors.push({ url: page.url(), error: String(error) }))
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2), 'utf8')

async function capture(row, state) {
  const owner = page.locator('.erp-tools-guest')
  const overflow = await owner.evaluate(element => element.scrollWidth - element.clientWidth)
  assert(overflow <= 2, `${row.id}/${state}: overflow ${overflow}`)
  const height = await owner.evaluate(element => element.scrollHeight)
  for (let y = 0, index = 0; y < height && index < 6; y += 700, index++) {
    await owner.evaluate((element, top) => { element.scrollTop = top }, y)
    const file = `${row.id}-${state}-${index}.png`
    await page.screenshot({ path: path.join(out, file), animations: 'disabled' })
    row.screenshots.push(file)
  }
  await owner.evaluate(element => { element.scrollTop = 0 })
}

try {
  await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  for (const tool of catalog.tools.filter(tool => tool.status === 'ready')) {
    const row = { id: tool.id, slug: tool.slug, status: 'running', actions: [], screenshots: [] }
    report.tools.push(row)
    try {
      await page.goto(`${site}/${tool.slug}`, { waitUntil: 'networkidle' })
      if (deferred.has(tool.id)) { row.status = 'deferred'; continue }
      const picker = page.locator('input[type=file]').first()
      if (await picker.count()) {
        const accept = await picker.getAttribute('accept') ?? ''
        if (!/video|audio|json|xml|xlsx|csv/i.test(accept) && tool.id !== 'remove-background') {
          const file = /image/i.test(accept) && !/pdf/i.test(accept) ? 'anh-hien-truong.jpg' : 'hop-dong.pdf'
          await picker.setInputFiles(FIX + file)
          row.actions.push(`Upload ${file}`)
          if (tool.id === 'merge-pdf') await picker.setInputFiles([FIX + 'hop-dong.pdf', FIX + 'phu-luc.pdf'])
          if (tool.id === 'compare' && await page.locator('input[type=file]').count() > 1) await page.locator('input[type=file]').nth(1).setInputFiles(FIX + 'hop-dong-v2.pdf')
          await page.waitForTimeout(450)
        } else row.specializedInput = accept
      }
      if (tool.noFile) {
        for (const field of await page.locator('input:visible:not([type=file]):not([type=checkbox]):not([type=radio]),textarea:visible').all()) {
          if (!await field.isEditable()) continue
          const type = await field.getAttribute('type')
          const hint = await field.getAttribute('placeholder') ?? ''
          if (['range', 'password', 'button', 'submit'].includes(type)) continue
          const value = type === 'date' ? '2026-10-12' : type === 'time' ? '08:00' : type === 'number' ? '12' : type === 'email' ? 'qa@example.test' : type === 'url' || /https/.test(hint) ? 'https://example.test/qa' : type === 'color' ? '#005bea' : /100|132|kg|cm|m²/.test(hint) ? '1200' : 'QA mobile'
          await field.fill(value)
          row.actions.push(`Fill ${type ?? 'text'}`)
        }
      }
      await capture(row, 'loaded')
      const tabs = page.locator('[role=tab]:visible, .cn-flow-switch button:visible')
      for (let index = 0; index < await tabs.count(); index++) {
        if (!await tabs.nth(index).isEnabled()) continue
        row.actions.push(`Tab ${await tabs.nth(index).innerText()}`)
        await tabs.nth(index).click()
        await capture(row, `tab-${index}`)
      }
      row.status = 'passed'
    } catch (error) {
      row.status = 'failed'; row.error = String(error)
      await page.screenshot({ path: path.join(out, `${tool.id}-failed.png`) }).catch(() => {})
    } finally { save(); console.log(JSON.stringify({ id: row.id, status: row.status, error: row.error })) }
  }
  assert.equal(await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version), report.build)
} finally {
  report.status = report.tools.length === 68 && report.tools.every(tool => ['passed', 'deferred'].includes(tool.status)) && !report.errors.length ? 'passed' : 'failed'
  save()
  await browser.close()
}
if (report.status !== 'passed') process.exitCode = 1
