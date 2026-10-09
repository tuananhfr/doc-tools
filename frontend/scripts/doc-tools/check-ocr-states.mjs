import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium, outDir } from './lib/qa.mjs'

const site = process.env.SITE ?? 'http://localhost:3016', out = outDir('ocr-states')
const fixtures = process.env.OCR_FIXTURES ?? path.join(process.env.LOCALAPPDATA, 'Temp/erpcons-doc-tools/out/ocr-fixtures-v2')
const manifest = JSON.parse(fs.readFileSync(path.join(fixtures, 'manifest.json'), 'utf8'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true })
const page = await context.newPage(), events = [], unexpectedWrites = [], errors = []
await context.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, total: 0, tools: {} } }))
context.on('request', request => {
  if (request.method() !== 'POST') return
  const url = new URL(request.url()), body = JSON.parse(request.postData() ?? '{}'), keys = Object.keys(body).sort().join(',')
  if (url.origin === new URL(site).origin && url.pathname.endsWith('/tools/visits') && keys === 'tool') return
  if (url.origin === new URL(site).origin && url.pathname.endsWith('/tools/quality') && keys === 'event,tool') { events.push(body); return }
  unexpectedWrites.push(url.pathname)
})
page.on('pageerror', error => errors.push(String(error)))
const report = { target: site, actor: 'anonymous Free user', cases: [], errors, unexpectedWrites, limitations: ['Emulated mobile viewport; no physical-device performance claim', 'Real handwriting has no approved transcript and is not scored'] }
const receipt = path.join(fixtures, 'baseline-v1/RECEIPT-CLEAN.png')
async function open(profile, passes = '2', file = receipt) {
  await page.goto(site + '/anh-sang-van-ban', { waitUntil: 'networkidle' })
  await page.getByLabel('Loại nội dung', { exact: true }).selectOption(profile)
  await page.getByLabel('Số lượt đối chiếu', { exact: true }).selectOption(passes)
  await page.getByLabel('Định dạng tải về', { exact: true }).selectOption('json')
  await page.locator('input[type=file]').first().setInputFiles(file)
}
async function read() { await page.locator('.erp-flow__run').click(); await page.locator('.cn-ocr-review').waitFor({ timeout: 120000 }) }
async function confirmWords() {
  for (let count = 0; await page.locator('.cn-ocr-review__word.needs-review').count(); count++) {
    assert(count < 300)
    await page.locator('.cn-ocr-review__word.needs-review').first().click()
    await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
  }
}
async function jsonOutput(name) {
  await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
  await page.locator('.erp-flow-result').waitFor({ timeout: 120000 })
  const pending = page.waitForEvent('download'); await page.getByRole('button', { name: 'Tải về', exact: true }).click()
  const file = path.join(out, name + '.json'); await (await pending).saveAs(file)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}
async function check(name, action, privateInput = false) {
  try { const details = await action(); report.cases.push({ name, status: 'passed', ...details }) }
  catch (error) {
    report.cases.push({ name, status: 'failed', error: String(error) })
    if (!privateInput) await page.screenshot({ path: path.join(out, name + '-failure.png'), fullPage: true }).catch(() => undefined)
  }
  console.log(JSON.stringify(report.cases.at(-1)))
  await context.setOffline(false)
}
try {
  // `/` is the landing page; search (and its zero-result events) live on `/cong-cu`.
  await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  await check('quality-consent', async () => {
    const checkbox = page.locator('.cn-quality-consent input[type=checkbox]').first()
    assert(await checkbox.count()); assert(!await checkbox.isChecked())
    await page.locator('#tim-cong-cu').fill('qzxv-no-result'); await page.locator('.cn-search-submit').click()
    assert.equal(events.length, 0)
    await checkbox.check(); await page.locator('#tim-cong-cu').fill('other-qzxv-no-result')
    await Promise.all([page.waitForResponse(response => response.url().endsWith('/tools/quality')), page.locator('.cn-search-submit').click()])
    assert(events.some(event => event.event === 'zero-result'))
    const count = events.length; await checkbox.uncheck()
    await page.locator('#tim-cong-cu').fill('third-qzxv-no-result'); await page.locator('.cn-search-submit').click()
    await page.waitForTimeout(100); assert.equal(events.length, count)
    await page.reload({ waitUntil: 'networkidle' }); assert(!await checkbox.isChecked())
    return { finiteEvents: events.length, defaultOff: true, revoked: true, reloadClearsConsent: true }
  })
  await check('search-table-handoff', async () => {
    await page.locator('#tim-cong-cu').fill('Ảnh bảng sang Excel')
    await page.locator('.erp-tools-grid .erp-tool-card').first().click()
    assert.equal(await page.getByLabel('Loại nội dung', { exact: true }).inputValue(), 'table')
    assert.equal(await page.getByLabel('Định dạng tải về', { exact: true }).inputValue(), 'xlsx')
    return { optionsPreserved: true }
  })
  await check('cancel-and-retry', async () => {
    await open('printed'); await page.locator('.erp-flow__run').click()
    await page.locator('.erp-flow-progress__cancel').click()
    await page.locator('.erp-flow__run').waitFor(); assert.equal(await page.locator('.cn-ocr-review').count(), 0)
    await read(); assert(await page.getByText('Chờ bạn đối chiếu và xác nhận nội dung.', { exact: true }).count())
    await page.locator('.erp-flow-progress__cancel').click(); await page.locator('.erp-flow__run').waitFor()
    return { retryReachedReview: true }
  })
  await check('language-download-recovery', async () => {
    const cold = await browser.newContext({ serviceWorkers: 'block' }), coldPage = await cold.newPage()
    try {
      await cold.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, total: 0 } }))
      await cold.route('**/vie.traineddata.gz', route => route.fulfill({ status: 503, body: 'Unavailable' }))
      await coldPage.goto(site + '/anh-sang-van-ban', { waitUntil: 'networkidle' })
      await coldPage.locator('input[type=file]').first().setInputFiles(receipt)
      await coldPage.locator('.erp-flow__run').click()
      await coldPage.locator('.erp-flow-error').waitFor({ timeout: 30000 })
      await cold.unroute('**/vie.traineddata.gz')
      await cold.route('**/vie.traineddata.gz', async route => {
        await new Promise(resolve => setTimeout(resolve, 750))
        await route.continue()
      })
      await coldPage.locator('.erp-flow__run').click()
      await coldPage.locator('.erp-flow-progress__cancel').waitFor()
      assert(await coldPage.locator('.erp-flow-progress__cancel').isEnabled())
      await coldPage.locator('.cn-ocr-review').waitFor({ timeout: 120000 })
      return { unavailableModelReturnsToInput: true, retryReachedReview: true, delayedModelDownloadMs: 750, cancelAvailableDuringDownload: true }
    } finally { await cold.close() }
  })
  await check('numeric-third-pass', async () => {
    await open('numeric', '3'); await read(); await confirmWords()
    const output = await jsonOutput('numeric'), pipeline = output.pages[0].pipeline
    assert.equal(pipeline.passes.length, 3)
    assert(pipeline.passes[2].crops.length > 0)
    assert(output.pages[0].words.some(word => word.candidates.some(candidate => candidate.pass === 'numeric')))
    return { passCount: 3, cropCount: pipeline.passes[2].crops.length }
  })
  await check('same-source-profile-cache', async () => {
    const before = JSON.parse(fs.readFileSync(path.join(out, 'numeric.json'), 'utf8')).pages[0]
    await page.getByRole('button', { name: 'Làm lại', exact: true }).click()
    await page.getByLabel('Loại nội dung', { exact: true }).selectOption('printed')
    await page.getByLabel('Số lượt đối chiếu', { exact: true }).selectOption('1')
    await read(); await confirmWords()
    const after = (await jsonOutput('changed-profile')).pages[0]
    assert.equal(after.sourceId, before.sourceId)
    assert.equal(after.sourceHash, before.sourceHash)
    assert.notEqual(after.pipeline.fingerprint, before.pipeline.fingerprint)
    assert.equal(after.pipeline.profile, 'printed')
    assert.equal(after.pipeline.passes.length, 1)
    return { sameSource: true, invalidatedFingerprint: true, selectedProfileRan: true }
  })
  await check('form-validation', async () => {
    await open('form'); await read()
    const fields = page.locator('.cn-ocr-fields > div')
    assert.equal(await fields.count(), 3)
    for (const [index, value] of ['Nguyễn Văn An', '1250000', '31/02/2024'].entries()) {
      await fields.nth(index).locator('input').fill(value); await fields.nth(index).locator('button').click()
    }
    assert(await page.getByText(/Ngày không hợp lệ/).count())
    assert(await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).isDisabled())
    await fields.nth(2).locator('input').fill('29/02/2024'); await fields.nth(2).locator('button').click()
    await confirmWords()
    for (const [index, value] of ['Nguyễn Văn An', '1250000', '29/02/2024'].entries()) {
      await fields.nth(index).locator('input').fill(value); await fields.nth(index).locator('button').click()
    }
    await page.locator('.cn-ocr-fields').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(out, 'form-390.png') })
    for (const zoom of [1.25, 1.5]) {
      await page.evaluate(value => { document.body.style.zoom = String(value) }, zoom)
      await page.locator('.cn-ocr-fields').scrollIntoViewIfNeeded()
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2))
      await page.screenshot({ path: path.join(out, `form-css-zoom-${zoom}.png`) })
    }
    await page.evaluate(() => { document.body.style.zoom = '' })
    const output = await jsonOutput('form')
    assert(output.pages[0].layout.fields.every(field => field.verified?.by === 'local-user'))
    assert(output.pages[0].text.includes('29/02/2024'))
    return { invalidDateBlocked: true, verifiedFields: 3 }
  })
  await check('manual-perspective', async () => {
    const fixture = manifest.cases.find(item => item.id === 'GRID-PERSPECTIVE')
    await open('table', '2', path.join(fixtures, fixture.file))
    await page.locator('.cn-ocr-corners summary').click()
    await page.getByRole('button', { name: 'Bắt đầu từ bốn góc ảnh', exact: true }).click()
    for (const [index, point] of fixture.paperCorners.entries()) for (const [axis, maximum] of [['x', 1200], ['y', 900]]) {
      await page.getByLabel(`Góc ${index + 1}, ${axis} (%)`, { exact: true }).fill(String(point[axis] / maximum * 100))
    }
    assert(!await page.locator('.erp-flow__run').isDisabled())
    await page.screenshot({ path: path.join(out, 'corners-390.png') }); await read()
    assert(await page.getByText(/Đã thêm lượt đọc sau khi chỉnh góc giấy/).count())
    await page.locator('.erp-flow-progress__cancel').click()
    return { validCornersRan: true }
  })
  if (process.env.HANDWRITING_INPUT) await check('real-photo-unsupported-review', async () => {
    await open('mixed', '1', process.env.HANDWRITING_INPUT); await read()
    assert(await page.getByText(/Chưa có model chữ tay đã kiểm chứng/).count())
    assert.equal(await page.locator('.cn-ocr-review__word').count(), await page.locator('.cn-ocr-review__word.needs-review').count())
    assert(await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).isDisabled())
    await page.locator('.erp-flow-progress__cancel').click()
    return { accuracy: null, allWordsRequireReview: true, noPhotoOrTranscriptSaved: true }
  }, true)
  await check('offline-ocr', async () => {
    await open('printed'); await page.waitForFunction(() => Boolean(navigator.serviceWorker?.controller), { timeout: 30000 })
    const prepare = page.getByRole('button', { name: 'Chuẩn bị dùng ngoại tuyến', exact: true })
    if (await prepare.count()) await prepare.click()
    await page.getByText('Tài nguyên OCR đã sẵn sàng ngoại tuyến trên thiết bị này.', { exact: true }).waitFor({ timeout: 60000 })
    await context.setOffline(true); await page.reload({ waitUntil: 'domcontentloaded' })
    await page.getByLabel('Định dạng tải về', { exact: true }).selectOption('json')
    await page.locator('input[type=file]').first().setInputFiles(receipt)
    await page.locator('.erp-flow__run').click(); await page.locator('.cn-ocr-review').waitFor({ timeout: 120000 })
    await confirmWords(); await jsonOutput('offline')
    return { offlineReloadAndDownload: true }
  })
  report.status = report.cases.every(item => item.status === 'passed') && !errors.length && !unexpectedWrites.length ? 'passed' : 'failed'
} finally {
  if (report.status !== 'passed') process.exitCode = 1
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
  await browser.close()
}
