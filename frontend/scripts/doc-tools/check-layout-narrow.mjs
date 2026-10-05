import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'
const OUT = outDir('layout-narrow')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
page.on('dialog', (d) => d.accept())
const shot = (name, opts = {}) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, ...opts })
const out = { theme, vw }

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.locator('.erp-doc-drop__title').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf', FIX + 'bang-ke.pdf', FIX + 'ho-so-scan.pdf'])
await page.locator('.erp-doc-page').nth(14).waitFor({ state: 'attached', timeout: 60000 })
await page.waitForTimeout(800)

// Minor 1: không còn vạch ngăn nhóm.
out.groupBorders = await page.locator('.erp-doc-toolbar__group').evaluateAll((els) => els.map((el) => getComputedStyle(el).borderRightWidth))
await page.locator('.erp-doc-toolbar').screenshot({ path: `${OUT}${theme}-${vw}-toolbar.png` })

// Minor 3: nút Xuất tệp dính đáy ở màn hẹp, bấm tới cột xuất rồi tự ẩn.
const jump = page.locator('.erp-doc-jump__button')
out.jumpVisible = await jump.isVisible()
if (out.jumpVisible) {
  await shot('jump')
  await jump.click()
  await page.waitForTimeout(800)
  out.panelTop = Math.round((await page.locator('#doc-tools-panel').boundingBox()).y)
  out.toolbarBottom = Math.round(await page.locator('.erp-doc-toolbar').evaluate((el) => el.getBoundingClientRect().bottom))
  out.jumpAfter = await jump.count()
  await shot('jump-after')
}

// Minor 2: ô DPI không cắt chữ, dòng gợi ý đổi theo lựa chọn.
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const dpi = page.getByLabel('Độ phân giải')
await dpi.scrollIntoViewIfNeeded()
out.dpiOptions = await dpi.locator('option').allInnerTexts()
await dpi.selectOption('300')
out.dpiHint = await page.locator('#doc-tools-export-image .erp-doc-export__hint').innerText()
out.dpiFits = await dpi.evaluate((el) => {
  const c = document.createElement('canvas').getContext('2d')
  const st = getComputedStyle(el)
  c.font = `${st.fontWeight} ${st.fontSize} ${st.fontFamily}`
  const text = el.options[el.selectedIndex].text
  return c.measureText(text).width <= el.clientWidth - parseFloat(st.paddingLeft) - parseFloat(st.paddingRight)
})
await page.locator('#doc-tools-export-image').screenshot({ path: `${OUT}${theme}-${vw}-dpi.png` })

out.errors = errors
console.log(JSON.stringify(out))
await browser.close()
