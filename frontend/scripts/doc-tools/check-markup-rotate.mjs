import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('markup-rotate')

const theme = process.env.THEME ?? 'dark'
const [vw, vh] = (process.env.VIEW ?? '768x1024').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, acceptDownloads: true, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'anh-hien-truong.jpg'])
await page.locator('.erp-doc-page').first().waitFor()
await page.waitForTimeout(1000)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const tap = async (tool, p) => {
  if (tool) await page.getByRole('button', { name: tool, exact: true }).click()
  const box = await page.locator('.erp-doc-markup').boundingBox()
  const x = box.x + p[0] * box.width
  const y = box.y + p[1] * box.height
  if (mobile) await page.touchscreen.tap(x, y)
  else await page.mouse.click(x, y)
}

await page.getByRole('button', { name: 'Xem to trang 1' }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await page.locator('.erp-doc-markup').waitFor()
await page.waitForTimeout(500)
await shot('toolbar')

await tap('Dấu duyệt', [0.5, 0.2])
await tap('Chữ', [0.1, 0.8])
await page.keyboard.type('Ảnh hiện trường 30/09')
await shot('typing')
await page.keyboard.press('Control+Enter')

let drew = false
if (!mobile) {
  await page.getByRole('button', { name: 'Khung chữ nhật', exact: true }).click()
  const box = await page.locator('.erp-doc-markup').boundingBox()
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6, { steps: 6 })
  await page.mouse.up()
  drew = true
}
await page.waitForTimeout(300)
await shot('image-marked')
const prims = await page.locator('.erp-doc-markup > g > *').count()

await page.getByRole('button', { name: 'Xong' }).click()
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

// Xoay trang SAU khi đã đánh dấu: dấu phải xoay theo nội dung.
await page.locator('.erp-doc-page__select').first().click()
await page.getByRole('button', { name: 'Xoay phải' }).click()
await page.waitForTimeout(800)
await shot('grid-rotated')

const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /^Tải (\d+ )?ảnh$/ }).click()])
const jpg = `${OUT}${theme}-${vw}-export.jpg`
await download.saveAs(jpg)

console.log(JSON.stringify({ theme, vw, prims, drew, errors }))
await browser.close()
