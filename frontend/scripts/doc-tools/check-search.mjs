import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('search')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
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
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf', FIX + 'xoay-crop.pdf', FIX + 'anh-hien-truong.jpg'])
await page.locator('.erp-doc-page').nth(4).waitFor()
await page.waitForTimeout(1200)
const total = await page.locator('.erp-doc-page').count()

// Trang CropBox lệch (thứ 2 của xoay-crop) được người dùng xoay thêm.
const cropIndex = total - 3
await page.locator('.erp-doc-page__select').nth(cropIndex).click()
await page.getByRole('button', { name: 'Xoay phải' }).click()
await page.keyboard.press('Escape')

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const status = () => page.locator('.erp-doc-search__status').innerText()
async function searchFor(text) {
  const input = page.getByRole('searchbox', { name: 'Tìm trong tài liệu' })
  await input.fill(text)
  await page.waitForFunction(() => !document.querySelector('.erp-doc-search__status .spinner-border'), null, { timeout: 30000 })
  await page.waitForTimeout(400)
  return status()
}

await page.keyboard.press('Control+f')
await page.waitForTimeout(300)
const focused = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'))
const out = { total, focused }

out.hopDong = await searchFor('hop dong')
out.hopDongStrict = await (async () => {
  await page.getByLabel('Phân biệt dấu').check()
  const r = await searchFor('hop dong')
  await page.getByLabel('Phân biệt dấu').uncheck()
  return r
})()
out.accented = await searchFor('Hợp đồng')
await page.locator('.erp-doc-page__hits').first().waitFor()
out.badges = await page.locator('.erp-doc-page__hits').count()
await shot('panel')

// Enter mở kết quả đầu trong ô xem to.
await page.getByRole('searchbox', { name: 'Tìm trong tài liệu' }).press('Enter')
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(900)
out.firstHitPolys = await page.locator('.erp-doc-hits polygon').count()
out.activePolys = await page.locator('.erp-doc-hits polygon.is-active').count()
await shot('preview-hit1')
await page.keyboard.press('F3')
await page.waitForTimeout(900)
out.afterF3 = await page.locator('.erp-doc-preview__title').innerText()
out.posAfterF3 = await page.getByRole('group', { name: 'Kết quả tìm' }).locator('output').innerText()
await page.keyboard.press('Escape')

for (const [name, query] of [
  ['rotate', 'top of unrotated'],
  ['crop', 'CROPBOX 50,60'],
  ['ctm', 'UNBALANCED'],
]) {
  out[name] = await searchFor(query)
  const first = page.locator('.erp-doc-search__hit').first()
  if (await first.count()) {
    await first.click()
    await page.locator('.erp-doc-preview__canvas canvas').waitFor()
    await page.waitForTimeout(1200)
    await shot(`preview-${name}`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
}

out.textless = await (async () => {
  await searchFor('zzzz')
  return page.locator('.erp-doc-search__note').innerText().catch(() => '')
})()
out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
