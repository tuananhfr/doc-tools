import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('markup-snap')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
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
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf', FIX + 'xoay-crop.pdf'])
await page.locator('.erp-doc-page').nth(14).waitFor()
await page.waitForTimeout(1000)
await page.locator('.erp-doc-page__select').nth(13).click()
await page.getByRole('button', { name: 'Xoay phải' }).click()
await page.keyboard.press('Escape')

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const shapes = () => page.locator('.erp-doc-markup > g > *').count()
const out = { theme, vw }

async function openAt(query) {
  await page.keyboard.press('Control+f')
  const input = page.getByRole('searchbox', { name: 'Tìm trong tài liệu' })
  await input.fill(query)
  await page.waitForTimeout(700)
  await page.waitForFunction(() => document.querySelector('.erp-doc-search__hit'), null, { timeout: 30000 })
  await input.press('Enter')
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
  await page.locator('.erp-doc-markup').waitFor()
  await page.waitForTimeout(600)
  // Đo SAU khi bật Đánh dấu: thanh công cụ dấu chen vào đẩy trang xuống.
  return page.locator('.erp-doc-hits polygon.is-active').boundingBox()
}

async function tool(name) {
  await page.getByRole('button', { name, exact: true }).click()
}

async function drag(a, b, steps = 10) {
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps)
  await page.mouse.up()
  await page.waitForTimeout(150)
}

async function close() {
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

// Trang 1 hop-dong: kéo tô sáng từ giữa dòng tiêu đề xuống dòng thứ ba.
const a = await openAt('Hợp đồng thi')
await tool('Tô sáng')
await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2)
await page.waitForTimeout(100)
out.hoverText = await page.locator('.erp-doc-markup[data-over-text]').count()
await page.mouse.move(a.x + a.width / 2, a.y - 3 * a.height)
await page.waitForTimeout(100)
out.hoverEmpty = await page.locator('.erp-doc-markup[data-over-text]').count()
await drag({ x: a.x + a.width * 0.4, y: a.y + a.height / 2 }, { x: a.x + a.width * 0.8, y: a.y + a.height * 4.2 })
out.multiLine = await shapes()
await page.keyboard.press('Control+z')
out.afterUndo = await shapes()
await page.keyboard.press('Control+y')
out.afterRedo = await shapes()
await tool('Gạch chân')
await drag({ x: a.x + 1, y: a.y + a.height / 2 }, { x: a.x + a.width - 1, y: a.y + a.height / 2 })
out.underline = (await shapes()) - out.afterRedo
await tool('Tô sáng')
const sheet = await page.locator('.erp-doc-markup').boundingBox()
await drag({ x: sheet.x + sheet.width * 0.1, y: sheet.y + sheet.height * 0.08 }, { x: sheet.x + sheet.width * 0.3, y: sheet.y + sheet.height * 0.15 })
out.freeBox = (await shapes()) - out.afterRedo - out.underline
await shot('hopdong-marked')
await close()

// /Rotate 90, CropBox + xoay thêm, CTM lệch.
for (const [name, query, toolName] of [
  ['rotate', 'top of unrotated', 'Gạch ngang'],
  ['crop', 'CROPBOX 50,60', 'Gạch chân'],
  ['ctm', 'UNBALANCED', 'Tô sáng'],
]) {
  const b = await openAt(query)
  await tool(toolName)
  const vertical = b.height > b.width
  const from = vertical ? { x: b.x + b.width / 2, y: b.y + b.height - 1 } : { x: b.x + 1, y: b.y + b.height / 2 }
  const to = vertical ? { x: b.x + b.width / 2, y: b.y + 1 } : { x: b.x + b.width - 1, y: b.y + b.height / 2 }
  const before = await shapes()
  await drag(from, to)
  out[name] = (await shapes()) - before
  await shot(`${name}-marked`)
  await close()
}

console.log(JSON.stringify(out))
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)

await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
await page.getByRole('button', { name: 'Gỡ hết' }).first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles(pdfPath)
await page.locator('.erp-doc-page').nth(14).waitFor()
for (const n of [1, 13, 14, 15]) {
  await page.getByRole('button', { name: `Xem to trang ${n}`, exact: true }).click()
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1200)
  await shot(`export-p${n}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

out.errors = errors
console.log(JSON.stringify(out))
await browser.close()
