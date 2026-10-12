// Offline sweep (OFF01): every ready tool, opened with the network cut, must show the offline level
// it declares, and tools declared 'yes' must load with zero failed requests and zero page errors.
// Needs a production build served on 3002 (the service worker is off in dev):
//   npm run build && npm run start      (other terminal)
//   QA_OUT=qa-output node scripts/doc-tools/check-offline.mjs
// Exit 0 = pass, 1 = mismatch, 2 = service worker never took control (nothing was tested).
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium, mockFreeSession, ORIGIN, outDir } from './lib/qa.mjs'

const root = path.resolve(import.meta.dirname, '..', '..')
const { ALL_TOOLS } = await import(pathToFileURL(path.join(root, 'src/features/tools/hub/config/tool-list.ts')).href)
const { isProductEntry, isExternalCapability } = await import(pathToFileURL(path.join(root, 'src/features/site/config/product-registry.ts')).href)
const tools = ALL_TOOLS.filter(tool => tool.status === 'ready' && !isProductEntry(tool) && !isExternalCapability(tool))
const OUT = outDir('offline')

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN' })
await mockFreeSession(context)
const page = await context.newPage()
const result = { sw: null, controlled: false, expected: tools.length, checked: 0, mismatches: [], yesFailures: [], action: null }

await page.goto(ORIGIN + '/')
result.sw = await page.evaluate(async () => {
  const registration = await Promise.race([navigator.serviceWorker.ready, new Promise(resolve => setTimeout(() => resolve(null), 30000))])
  return registration?.active?.state ?? 'none'
})
await page.reload()
result.controlled = await page.evaluate(() => Boolean(navigator.serviceWorker.controller))
if (!result.controlled) {
  console.log(JSON.stringify(result, null, 2))
  await browser.close()
  process.exit(2)
}

// Mocks must go before cutting the network, or they would answer for an offline device.
await context.unrouteAll({ behavior: 'ignoreErrors' })
await context.setOffline(true)

for (const tool of tools) {
  const failed = []
  const errors = []
  const onFailed = request => { const url = new URL(request.url()); if (url.origin === ORIGIN && !url.pathname.includes('/api/')) failed.push(url.pathname) }
  const onResponse = response => { const url = new URL(response.url()); if (url.origin === ORIGIN && !url.pathname.includes('/api/') && response.status() >= 400) failed.push(`${response.status()} ${url.pathname}`) }
  const onError = error => errors.push(String(error).slice(0, 200))
  page.on('requestfailed', onFailed)
  page.on('response', onResponse)
  page.on('pageerror', onError)
  try {
    await page.goto(`${ORIGIN}/${tool.slug}${tool.searchParams ? `?${tool.searchParams}` : ''}`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.locator('.cn-tool-capability').waitFor({ timeout: 20000 })
    await page.locator('.cn-tool-offline-notice').waitFor({ timeout: 5000 })
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {})
    const shown = await page.locator('.cn-tool-capability [data-offline]').getAttribute('data-offline')
    const notice = await page.locator('.cn-tool-offline-notice').getAttribute('data-offline-notice')
    if (shown !== tool.device.offline || notice !== tool.device.offline) result.mismatches.push({ id: tool.id, declared: tool.device.offline, shown, notice })
    if (tool.device.offline === 'yes' && (failed.length || errors.length)) {
      result.yesFailures.push({ id: tool.id, failed: [...new Set(failed)].slice(0, 5), errors: errors.slice(0, 3) })
      await page.screenshot({ path: `${OUT}${tool.id}.png` })
    }
  } catch (error) {
    result.mismatches.push({ id: tool.id, declared: tool.device.offline, error: String(error).slice(0, 200) })
    await page.screenshot({ path: `${OUT}${tool.id}.png` }).catch(() => {})
  } finally {
    page.off('requestfailed', onFailed)
    page.off('response', onResponse)
    page.off('pageerror', onError)
    result.checked += 1
  }
}

// A real action offline: compress a generated JPEG with the image compressor.
try {
  await page.goto(`${ORIGIN}/nen-anh`, { waitUntil: 'domcontentloaded' })
  const jpeg = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 640; canvas.height = 480
    const context2d = canvas.getContext('2d')
    for (let x = 0; x < 640; x += 16) { context2d.fillStyle = `hsl(${x % 360} 70% 50%)`; context2d.fillRect(x, 0, 16, 480) }
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95))
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })
  await page.locator('input[type=file]').first().setInputFiles({ name: 'qa-offline.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(jpeg) })
  await page.locator('.erp-flow__run').first().click()
  await page.locator('.erp-flow-result').waitFor({ timeout: 60000 })
  result.action = 'ok'
} catch (error) {
  result.action = `failed: ${String(error).slice(0, 200)}`
  await page.screenshot({ path: `${OUT}action-nen-anh.png` }).catch(() => {})
}

await browser.close()
console.log(JSON.stringify(result, null, 2))
process.exit(result.checked === result.expected && !result.mismatches.length && !result.yesFailures.length && result.action === 'ok' ? 0 : 1)
