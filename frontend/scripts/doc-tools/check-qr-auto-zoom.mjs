import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import QRCode from 'qrcode'
import { chromium, outDir } from './lib/qa.mjs'

const target = process.env.BASE ?? 'http://localhost:3002/doc-ma-qr'
const out = outDir('qr-auto-zoom')
const qr = await QRCode.toDataURL('https://example.com/auto-zoom', { width: 330, margin: 4, version: 3 })
const matrix = QRCode.create('https://example.com/auto-zoom', { version: 3 }).modules
const blocks = []
for (let y = 0; y < matrix.size; y++) for (let x = 0; x < matrix.size; x++) {
  const finder = (y < 7 && (x < 7 || x >= matrix.size - 7)) || (x < 7 && y >= matrix.size - 7)
  if (finder && matrix.data[y * matrix.size + x]) blocks.push(`<rect x="${x + 4}" y="${y + 4}" width="1" height="1"/>`)
}
const candidate = 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${matrix.size + 8} ${matrix.size + 8}"><rect width="100%" height="100%" fill="white"/><g fill="black">${blocks.join('')}</g></svg>`).toString('base64')

async function cameraFixture({ qr, candidate, native, rejectZoom }) {
  if (!navigator.mediaDevices) return
  window.autoZoomFixture = { mode: 'blank', zoom: 1, stopped: 0, requests: [] }
  Object.defineProperty(navigator.mediaDevices, 'getUserMedia', { configurable: true, value: async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 1920
    canvas.height = 1080
    const context = canvas.getContext('2d')
    const images = await Promise.all([qr, candidate].map(async src => {
      const image = new Image()
      image.src = src
      await image.decode()
      return image
    }))
    const draw = () => {
      context.fillStyle = '#b4c1cc'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.save()
      context.translate(960, 540)
      context.scale(window.autoZoomFixture.zoom, window.autoZoomFixture.zoom)
      context.translate(-960, -540)
      const mode = window.autoZoomFixture.mode
      if (mode !== 'blank') context.drawImage(images[mode === 'qr' ? 0 : 1], 915, 495, 90, 90)
      context.restore()
    }
    draw()
    const timer = setInterval(draw, 60)
    const stream = canvas.captureStream(15)
    const track = stream.getVideoTracks()[0]
    const stop = track.stop.bind(track)
    track.stop = () => { clearInterval(timer); window.autoZoomFixture.stopped++; stop() }
    track.getCapabilities = () => native ? { zoom: { min: 1, max: 4, step: 0.05 } } : {}
    track.getSettings = () => ({ width: 1920, height: 1080, zoom: window.autoZoomFixture.zoom })
    track.applyConstraints = async constraints => {
      window.autoZoomFixture.requests.push(constraints.advanced[0].zoom)
      if (rejectZoom) throw new DOMException('Fixture native zoom rejected', 'OverconstrainedError')
      window.autoZoomFixture.zoom = constraints.advanced[0].zoom
      draw()
    }
    return stream
  } })
}

const cases = [
  { name: 'native', width: 390, height: 844, mobile: true, native: true, ceiling: true },
  { name: 'software', width: 320, height: 640, mobile: true, native: false },
  { name: 'fallback', width: 768, height: 1024, mobile: false, native: true, rejectZoom: true },
  { name: 'desktop', width: 1440, height: 900, mobile: false, native: true },
  { name: 'landscape', width: 844, height: 390, mobile: true, native: false },
]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = { targetFingerprint: createHash('sha256').update(target).digest('hex'), environment: 'Chrome headless with synthetic camera', cases: [], limitations: ['Physical cameras, native hardware zoom, and iOS/Android browsers are not tested', 'Unreadable candidate preserves finder patterns but has deliberately removed payload data'] }

try {
  for (const spec of cases) {
    if (process.env.QR_QA_CASE && spec.name !== process.env.QR_QA_CASE) continue
    console.log(`Checking auto zoom: ${spec.name} (${spec.width}x${spec.height})`)
    const context = await browser.newContext({ viewport: { width: spec.width, height: spec.height }, isMobile: spec.mobile, hasTouch: spec.mobile, serviceWorkers: 'block' })
    await context.addInitScript(cameraFixture, { qr, candidate, native: spec.native, rejectZoom: spec.rejectZoom })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()) })
    await page.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, total: 0, tools: {} } }))
    await page.goto(target)
    await page.getByRole('button', { name: 'Quét bằng camera', exact: true }).click()
    const scanner = page.locator('.erp-qr-scanner')
    const zoom = scanner.getByRole('slider')
    await scanner.getByText('Đang tìm mã…', { exact: true }).waitFor()
    await scanner.scrollIntoViewIfNeeded()
    if (spec.mobile) await page.waitForFunction(() => getComputedStyle(document.querySelector('.erp-qr-scanner-modal .modal-dialog')).transform === 'none')
    await page.waitForTimeout(3000)
    assert.equal(await zoom.inputValue(), '1', 'An empty scene must not cause auto zoom')
    await page.evaluate(() => { window.autoZoomFixture.mode = 'candidate' })
    try {
      await page.waitForFunction(() => Number(document.querySelector('.erp-qr-scanner__zoom input').value) > 1, undefined, { timeout: 10000 })
    } catch (error) {
      await page.screenshot({ path:path.join(out,`${spec.name}-failed.png`), style:'nextjs-portal {display:none;}' })
      throw error
    }
    if (spec.native && !spec.rejectZoom) await page.waitForFunction(() => window.autoZoomFixture.zoom > 1)
    else assert.match(await scanner.locator('video').getAttribute('style'), /scale\(1\.25\)/)
    assert.equal(await scanner.locator('.erp-qr-scanner__result').count(), 0)
    await page.screenshot({ path: path.join(out, `${spec.name}-automatic.png`), style: 'nextjs-portal { display:none; }' })

    if (spec.ceiling) {
      await page.waitForFunction(() => document.querySelector('.erp-qr-scanner__zoom input').value === '3', undefined, { timeout: 30000 })
      await page.waitForTimeout(3000)
      assert.equal(await zoom.inputValue(), '3')
      const requests = await page.evaluate(() => window.autoZoomFixture.requests)
      assert(requests.every(value => value <= 3))
    } else {
      // A touch on the zoom control must relinquish auto zoom even without changing its value.
      await scanner.locator('output').click()
      const held = await zoom.inputValue()
      await page.waitForTimeout(3500)
      assert.equal(await zoom.inputValue(), held)
      await zoom.fill('2')
      await page.waitForTimeout(3500)
      assert.equal(await zoom.inputValue(), '2')
    }
    await page.evaluate(() => { window.autoZoomFixture.mode = 'qr' })
    await scanner.getByText('Đã đọc mã', { exact: true }).waitFor({ timeout: 10000 })
    assert.equal(await scanner.locator('.erp-qr-scanner__text').innerText(), 'https://example.com/auto-zoom')
    const decodedZoom = await zoom.inputValue()
    await page.waitForTimeout(2500)
    assert.equal(await zoom.inputValue(), decodedZoom)
    const geometry = await page.evaluate(() => {
      const rect = selector => { const r = document.querySelector(selector).getBoundingClientRect(); return { x:r.x,y:r.y,width:r.width,height:r.height } }
      return { scanner:rect('.erp-qr-scanner'), zoom:rect('.erp-qr-scanner__zoom'), footer:rect('.erp-qr-scanner__footer'), overflow:document.documentElement.scrollWidth > innerWidth }
    })
    assert.equal(geometry.overflow, false)
    assert(geometry.zoom.y + geometry.zoom.height <= geometry.footer.y + 1 || geometry.zoom.x + geometry.zoom.width <= geometry.footer.x)
    await page.screenshot({ path: path.join(out, `${spec.name}-decoded.png`), style: 'nextjs-portal { display:none; }' })
    await scanner.getByRole('button', { name: 'Tắt camera', exact: true }).click()
    await scanner.waitFor({ state: 'detached' })
    assert(await page.evaluate(() => window.autoZoomFixture.stopped > 0))
    assert.deepEqual(errors, [])
    report.cases.push({ ...spec, decodedZoom, geometry, errors, status: 'passed' })
    await context.close()
  }
  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ passed: report.cases.length, out }))
} finally {
  await browser.close()
}
