import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { chromium, FIX, outDir } from './lib/qa.mjs'

const site = process.env.SITE ?? 'http://localhost:3002'
const out = outDir('client-states')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true })
await context.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, user: null, plan: { pro: false }, capabilities: ['tool.use'], total: 0, tools: {} } }))
const page = await context.newPage()
page.on('dialog', dialog => void dialog.accept())
const report = { build: null, checks: [], errors: [], limitations: ['Offline means loaded local assets with network disabled, not a first-ever offline visit', 'Cancellation uses a synthetic 20-image batch'] }
page.on('pageerror', error => report.errors.push(String(error)))
async function check(id, run) {
  const row = { id, status: 'running' }; report.checks.push(row)
  try { Object.assign(row, await run()); row.status = 'passed' }
  catch (error) { row.status = 'failed'; row.error = String(error) }
  await page.screenshot({ path: path.join(out, `${id}.png`) }).catch(() => {})
  console.log(JSON.stringify(row))
}
const open = slug => page.goto(`${site}/${slug}`, { waitUntil: 'networkidle' })
try {
  await open('cong-cu')
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  await check('offline-unit-conversion', async () => {
    await open('chuyen-doi-don-vi')
    await context.setOffline(true)
    await page.locator('input').filter({ visible: true }).first().fill('2')
    await page.locator('.erp-tool-result--inline .erp-tool-result__value').filter({ hasText: '2.000' }).waitFor()
    return { inputMetres: 2, outputMillimetres: 2000 }
  })
  await context.setOffline(false)
  await check('offline-qr-export', async () => {
    await open('tao-ma-qr')
    await page.locator('input[type=url]').fill('https://example.test/offline')
    await page.locator('.erp-qr-preview svg').waitFor()
    await context.setOffline(true)
    const pending = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Tải mã QR', exact: true }).click()
    const file = await pending; const target = path.join(out, file.suggestedFilename()); await file.saveAs(target)
    const bytes = fs.readFileSync(target)
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a')
    return { bytes: bytes.length }
  })
  await context.setOffline(false)
  await check('merge-editor-handoff', async () => {
    await open('cong-cu?q=gh%C3%A9p+pdf&nhom=document')
    await page.locator('a.erp-tool-card').first().click()
    await page.waitForURL('**/ghep-pdf')
    const files = ['hop-dong.pdf', 'phu-luc.pdf']
    const pages = (await Promise.all(files.map(async file => (await PDFDocument.load(fs.readFileSync(FIX + file))).getPageCount()))).reduce((sum, count) => sum + count, 0)
    await page.locator('input[type=file]').first().setInputFiles(files.map(file => FIX + file))
    await page.locator('.erp-flow__run').click()
    await page.locator('.erp-flow-result').waitFor({ timeout: 60000 })
    await page.locator('.erp-flow-result__more').getByRole('button', { name: 'Sửa tiếp', exact: true }).click()
    await page.waitForURL('**/chinh-sua-pdf')
    await page.waitForFunction(expected => document.querySelectorAll('.erp-doc-page').length === expected, pages)
    const back = await page.locator('.erp-tool-crumb__back').getAttribute('href')
    assert(back.includes('q=gh%C3%A9p+pdf') && back.includes('nhom=document'), back)
    return { pages, catalogContextPreserved: true }
  })
  await check('cancel-retry-and-reject-invalid-image', async () => {
    await open('nen-anh')
    const input = page.locator('input[type=file]').first()
    const buffer = fs.readFileSync(FIX + 'anh-hien-truong.jpg')
    await input.setInputFiles(Array.from({ length: 20 }, (_, index) => ({ name: `qa-${index}.jpg`, mimeType: 'image/jpeg', buffer })))
    await page.waitForFunction(() => document.querySelectorAll('.erp-flow-file').length === 20)
    await page.locator('.erp-flow__run').click()
    await page.locator('.erp-flow-progress__cancel').click()
    await page.locator('.erp-flow__run').waitFor()
    await page.waitForTimeout(1200)
    assert.equal(await page.locator('.erp-flow-result').count(), 0)
    assert.equal(await page.locator('.erp-flow-file').count(), 20)
    await page.locator('.erp-flow-files__head .erp-flow-files__clear').click()
    await input.setInputFiles({ name: 'invalid.png', mimeType: 'image/png', buffer: Buffer.from('invalid fixture') })
    await page.locator('.erp-flow-rejected').waitFor()
    assert.equal(await page.locator('.erp-flow-file').count(), 0)
    await input.setInputFiles(FIX + 'anh-hien-truong.jpg')
    await page.waitForFunction(() => document.querySelectorAll('.erp-flow-file').length === 1)
    await page.locator('.erp-flow__run').click()
    await page.locator('.erp-flow-result').waitFor({ timeout: 60000 })
    return { cancellationPublishesNoOutput: true, selectedFilesPreserved: 20, invalidFileRejected: true, retryCompleted: true }
  })
  await check('reader-search-and-edit-keyboard-boundaries', async () => {
    await open('xem-pdf')
    await page.locator('input[type=file]').first().setInputFiles(FIX + 'hop-dong.pdf')
    await page.locator('.cn-pdf-reader__stage canvas').waitFor()
    await page.keyboard.press('Control+f')
    await page.locator('.erp-doc-export input[type=search]').waitFor()
    assert.equal(await page.locator('#doc-search-replace').count(), 0)
    await page.locator('.erp-doc-export input[type=search]').fill('thi')
    await page.locator('.erp-doc-search__hit').last().waitFor()
    await page.locator('.erp-doc-search__hit').last().click()
    await page.waitForFunction(() => document.querySelector('.cn-pdf-reader__page select')?.value === '11')
    await page.getByRole('link', { name: 'Chỉnh sửa PDF', exact: true }).click()
    await page.waitForURL('**/chinh-sua-pdf')
    assert.equal(await page.locator('#doc-search-replace').count(), 1)
    await page.locator('.erp-doc-page__select').first().click()
    await page.goBack()
    await page.waitForURL('**/xem-pdf')
    await page.locator('.cn-pdf-reader__controls button').first().focus()
    for (const key of ['Delete', 'Control+z', 'Control+a']) await page.keyboard.press(key)
    assert.equal(await page.locator('.cn-pdf-reader__page option').count(), 12)
    return { ctrlFOpensSearch: true, lastHitOpensPage12: true, editingControlsHiddenInReader: true, editHotkeysPreserveReaderPages: true }
  })
} finally {
  report.status = report.checks.length === 5 && report.checks.every(row => row.status === 'passed') && !report.errors.length ? 'passed' : 'failed'
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
}
if (report.status !== 'passed') process.exitCode = 1
