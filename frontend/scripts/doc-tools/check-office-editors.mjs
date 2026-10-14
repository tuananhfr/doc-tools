import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { unzipSync, strFromU8 } from 'fflate'
import ExcelJS from 'exceljs'
import { chromium, mockFreeSession, outDir, HUB } from './lib/qa.mjs'

const output = outDir('office-editors')
const tools = [
  { slug: 'soan-van-ban', ext: 'docx' },
  { slug: 'bang-tinh', ext: 'xlsx' },
  { slug: 'trinh-chieu', ext: 'pptx' },
]
const edit = 'EDITQA7731 Tiếng Việt: Đặng Thị Hồng.'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = { site: HUB, roundTrips: [], responsive: [], offline: [], recovery: [], network: [] }

async function ready(page) {
  const frame = await (await page.locator('.cn-office-frame').elementHandle()).contentFrame()
  await frame.waitForFunction(() => Boolean(window.wasmBindings) && !document.querySelector('[id$="_loading"]'), null, { timeout: 30000 })
  return frame
}

async function openFile(page, frame, file) {
  const canvas = frame.locator('canvas')
  const chooser = page.waitForEvent('filechooser', { timeout: 10000 })
  await canvas.press('Control+o')
  await (await chooser).setFiles(file)
  await page.waitForTimeout(1000)
}

async function exportSlide(page, canvas) {
  await canvas.press('Control+Shift+p')
  await page.waitForTimeout(200)
  await page.keyboard.insertText('app.exportDialog')
  await page.waitForTimeout(200)
  await page.keyboard.press('Enter')
  await page.waitForTimeout(300)
  const bounds = await canvas.boundingBox()
  assert.ok(bounds, 'Presentation canvas is not visible')
  // The canvas dialog moves with the editor viewport.
  await canvas.click({ position: { x: bounds.width / 2 - 160, y: bounds.height / 2 - 74 } })
  await page.waitForTimeout(200)
  await canvas.click({ position: { x: bounds.width / 2 + 133, y: bounds.height / 2 + 70 } })
}

try {
  for (const tool of tools) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, serviceWorkers: 'block' })
    // Exercise the upstream download fallback; native OS save dialogs need a separate visible-browser check.
    await context.addInitScript(() => { delete window.showSaveFilePicker })
    await mockFreeSession(context)
    const page = await context.newPage()
    const requests = []
    context.on('request', request => requests.push({ url: request.url(), method: request.method(), body: request.postData() ?? '' }))
    await page.goto(HUB + '/' + tool.slug)
    await page.locator('[data-office-state="idle"]').waitFor()
    assert.equal(requests.filter(request => request.url.includes('/vendor/office/')).length, 0, 'Office engine loaded before user opened it')
    await page.getByRole('button', { name: 'Mở trình soạn thảo', exact: true }).click()
    const frame = await ready(page)
    const canvas = frame.locator('canvas')
    await canvas.click({ position: { x: 400, y: 350 } })
    await openFile(page, frame, path.join(output, 'fixtures', 'NETQA7731.' + tool.ext))
    if (tool.ext === 'docx') {
      await canvas.click({ position: { x: 520, y: 308 } })
      await page.keyboard.press('Control+End')
    } else if (tool.ext === 'xlsx') {
      await canvas.click({ position: { x: 180, y: 224 } })
      await page.keyboard.press('Control+Home')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('F2')
    } else {
      await canvas.dblclick({ position: { x: 700, y: 250 }, delay: 100 })
      await page.waitForTimeout(300)
      await page.keyboard.press('Control+a')
      await page.waitForTimeout(200)
    }
    await page.waitForTimeout(200)
    if (tool.ext === 'pptx') {
      // The custom canvas consumes key events; DOM insertText alone bypasses it.
      const input = await context.newCDPSession(page)
      for (const key of edit) {
        await input.send('Input.dispatchKeyEvent', { type: 'keyDown', key, text: key, unmodifiedText: key })
        await input.send('Input.dispatchKeyEvent', { type: 'keyUp', key })
      }
      await input.detach()
    } else await page.keyboard.insertText(edit)
    await page.keyboard.press(tool.ext === 'xlsx' ? 'Enter' : 'Escape')
    await page.waitForTimeout(300)
    await page.screenshot({ animations: 'disabled', path: path.join(output, tool.ext + '-edited-1440.png') })
    const downloading = page.waitForEvent('download', { timeout: 15000 })
    if (tool.ext === 'pptx') await exportSlide(page, canvas)
    else await canvas.press('Control+s')
    const download = await downloading
    assert.equal(path.extname(download.suggestedFilename()), '.' + tool.ext)
    const saved = path.join(output, 'roundtrip-' + tool.ext + '.' + tool.ext)
    await download.saveAs(saved)
    const archive = unzipSync(fs.readFileSync(saved))
    const text = Object.entries(archive).filter(([name]) => name.endsWith('.xml')).map(([, bytes]) => strFromU8(bytes)).join('\n')
    assert.ok(text.includes('EDITQA7731'), 'Edited text missing from ' + tool.ext)
    assert.ok(text.includes('Đặng Thị Hồng'), 'Vietnamese code points lost in ' + tool.ext)
    if (tool.ext === 'xlsx') {
      const workbook = new ExcelJS.Workbook()
      await workbook.xlsx.readFile(saved)
      assert.equal(workbook.worksheets[0].getCell('B1').value, 42)
      assert.equal(workbook.worksheets[0].getCell('C1').value.formula, 'B1*2')
    }
    await openFile(page, frame, saved)
    await page.screenshot({ animations: 'disabled', path: path.join(output, tool.ext + '-roundtrip-1440.png') })
    const flags = requests.filter(request => {
      const url = new URL(request.url)
      return url.origin !== new URL(HUB).origin || request.url.includes('NETQA7731') || request.body.includes('NETQA7731') || request.body.includes('EDITQA7731') ||
        !['GET', 'HEAD', 'OPTIONS'].includes(request.method) && !url.pathname.endsWith('/tools/visits')
    })
    assert.deepEqual(flags, [], 'Unexpected network transmission')
    report.roundTrips.push({ slug: tool.slug, file: saved, editedUnicodePreserved: true, filePickerReopened: true, savePath: 'upstream download fallback' })
    report.network.push({ slug: tool.slug, requests: requests.length, flags })
    console.log(JSON.stringify(report.roundTrips.at(-1)))
    await context.close()
  }

  for (const width of [360, 390, 430, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, isMobile: width < 768, hasTouch: width < 768, deviceScaleFactor: 1, serviceWorkers: 'block' })
    await mockFreeSession(context)
    const page = await context.newPage()
    for (const tool of tools) {
      await page.goto(HUB + '/' + tool.slug)
      await page.locator('[data-office-state="idle"]').waitFor()
      await page.evaluate(() => document.fonts.ready)
      await page.screenshot({ animations: 'disabled', path: path.join(output, tool.ext + '-idle-' + width + '.png') })
      await page.getByRole('button', { name: 'Mở trình soạn thảo', exact: true }).click()
      const frame = await ready(page)
      await frame.evaluate(() => { window.__officeViewportProbe = true })
      await page.locator('.cn-office--expanded').waitFor()
      await page.getByRole('button', { name: 'Thu nhỏ', exact: true }).click()
      await page.getByRole('button', { name: 'Mở rộng', exact: true }).click()
      await page.locator('.cn-office--expanded').waitFor()
      assert.equal(await frame.evaluate(() => window.__officeViewportProbe), true, 'Viewport change recreated the iframe')
      await page.locator('.cn-office-toolbar').scrollIntoViewIfNeeded()
      await page.screenshot({ animations: 'disabled', path: path.join(output, tool.ext + '-open-' + width + '.png') })
      const geometry = await page.evaluate(() => ({ width: innerWidth, rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, scrollerOverflow: (() => { const el = document.querySelector('.erp-tools-guest'); return el ? el.scrollWidth - el.clientWidth : 0 })() }))
      assert.equal(geometry.width, width)
      assert.equal(geometry.rootOverflow, 0)
      assert.equal(geometry.scrollerOverflow, 0)
      await page.getByRole('button', { name: 'Đóng trình soạn thảo', exact: true }).click()
      await page.getByRole('dialog').waitFor()
      await page.locator('.modal-footer .btn-danger').click()
      await page.locator('[data-office-state="idle"]').waitFor()
      report.responsive.push({ slug: tool.slug, ...geometry, closeConfirmation: true })
    }
    await context.close()
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  await mockFreeSession(context)
  const page = await context.newPage()
  page.on('dialog', dialog => void dialog.accept())
  for (const tool of tools) {
    await context.setOffline(false)
    await page.goto(HUB + '/' + tool.slug)
    await page.locator('[data-office-state="idle"]').waitFor()
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), null, { timeout: 60000 })
    await page.getByRole('button', { name: 'Mở trình soạn thảo', exact: true }).click()
    await ready(page)
    await page.getByRole('button', { name: 'Đóng trình soạn thảo', exact: true }).click()
    await page.locator('.modal-footer .btn-danger').click()
    await context.setOffline(true)
    await page.getByRole('button', { name: 'Mở trình soạn thảo', exact: true }).click()
    await ready(page)
    report.offline.push({ slug: tool.slug, reopenedOffline: true })
    console.log(JSON.stringify(report.offline.at(-1)))
  }
  await context.close()
  const unsupportedContext = await browser.newContext({ serviceWorkers: 'block' })
  await mockFreeSession(unsupportedContext)
  await unsupportedContext.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', { value: undefined })
    const getContext = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function (type, ...args) { return type === 'webgl2' ? null : getContext.call(this, type, ...args) }
  })
  const unsupportedPage = await unsupportedContext.newPage()
  await unsupportedPage.goto(HUB + '/soan-van-ban')
  await unsupportedPage.getByRole('button', { name: 'Mở trình soạn thảo', exact: true }).click()
  await unsupportedPage.locator('[data-office-state="unsupported"]').waitFor()
  assert.equal(await unsupportedPage.locator('.cn-office-frame').count(), 0)
  report.recovery.push({ case: 'no WebGPU and no WebGL2', blockedIframe: true })
  await unsupportedContext.close()

  const retryContext = await browser.newContext({ serviceWorkers: 'block' })
  await mockFreeSession(retryContext)
  const retryPage = await retryContext.newPage()
  const indexPattern = '**/vendor/office/wordcraft-0.6.1/index.html'
  await retryContext.route(indexPattern, route => route.fulfill({ status: 503, body: 'QA unavailable' }))
  await retryPage.goto(HUB + '/soan-van-ban')
  await retryPage.getByRole('button', { name: 'Mở trình soạn thảo', exact: true }).click()
  await retryPage.locator('[data-office-state="unavailable"]').waitFor()
  await retryContext.unroute(indexPattern)
  await retryPage.getByRole('button', { name: 'Mở trình soạn thảo', exact: true }).click()
  await ready(retryPage)
  report.recovery.push({ case: '503 then retry', reopened: true })
  await retryPage.getByRole('button', { name: 'Thu nhỏ', exact: true }).click()
  await retryPage.getByRole('button', { name: 'Mở rộng', exact: true }).waitFor()
  await retryPage.getByRole('link', { name: 'Về công cụ', exact: true }).click()
  await retryPage.getByRole('dialog').waitFor()
  await retryPage.locator('.modal-footer .btn-outline-secondary').click()
  assert.ok(retryPage.url().endsWith('/soan-van-ban'))
  await retryPage.getByRole('link', { name: 'Về công cụ', exact: true }).click()
  await retryPage.locator('.modal-footer .btn-danger').click()
  await retryPage.waitForURL('**/cong-cu')
  report.recovery.push({ case: 'leave guard', stayThenLeave: true })
  await retryContext.close()
} finally {
  await browser.close()
  fs.writeFileSync(path.join(output, 'verification.json'), JSON.stringify(report, null, 2) + '\n')
}
console.log(JSON.stringify({ roundTrips: report.roundTrips.length, responsive: report.responsive.length, offline: report.offline.length }))
