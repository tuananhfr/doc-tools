// Kiểm tuỳ chọn "Chữ lớn" (Q6, spec v3 §04 Senior mode): bật trong menu giao diện → <html data-text-size="large">,
// chữ thân 18px, localStorage `cn.textSize`; F5 vẫn giữ và thuộc tính có TRƯỚC khi React chạy (script chặn
// đầu trang); tắt → 16px, xoá khoá. API bị chặn bằng phản hồi giả.
//
//   node scripts/doc-tools/check-text-size.mjs        (exit 0 = đạt)
import { chromium, mockFreeSession } from './lib/qa.mjs'

const site = (process.env.SITE ?? 'http://localhost:3002').replace(/\/$/, '')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
// 1366px: header site hiện `GuestPrefs` (trên điện thoại nó nằm trong menu trượt).
const context = await browser.newContext({ viewport: { width: 1366, height: 900 } })
await mockFreeSession(context)
const page = await context.newPage()
const state = () => page.evaluate(() => ({ attr: document.documentElement.dataset.textSize ?? null, body: parseFloat(getComputedStyle(document.body).fontSize), stored: localStorage.getItem('cn.textSize') }))
const pick = async (value) => {
  await page.locator('.cn-header .erp-tools-prefs__toggle').click()
  await page.locator(`[data-text-size-option="${value}"]`).click()
  await page.waitForTimeout(200)
}

await page.goto(`${site}/cong-cu`, { waitUntil: 'networkidle' })
const initial = await state()
await pick('large')
const large = await state()
// `commit` = HTML vừa về, chưa chạy bundle React: thuộc tính lúc này chỉ có thể do script chặn đầu trang đặt.
await page.goto(`${site}/cong-cu`, { waitUntil: 'commit' })
await page.waitForSelector('body', { state: 'attached' })
const earlyAttr = await page.evaluate(() => document.documentElement.dataset.textSize ?? null)
await page.waitForLoadState('networkidle')
const reloaded = await state()
await pick('normal')
const normal = await state()
await browser.close()

const ok = initial.attr === null && initial.body === 16
  && large.attr === 'large' && large.body === 18 && large.stored === 'large'
  && earlyAttr === 'large' && reloaded.attr === 'large' && reloaded.body === 18
  && normal.attr === null && normal.body === 16 && normal.stored === null
console.log(JSON.stringify({ ok, initial, large, earlyAttr, reloaded, normal }))
process.exitCode = ok ? 0 : 1
