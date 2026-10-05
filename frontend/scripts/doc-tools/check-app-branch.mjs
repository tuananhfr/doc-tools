// Nhánh TRONG khung app (`/tools`): mở trang chọn công cụ rồi lần lượt từng công cụ với một phiên giả,
// soi mỗi màn có nằm trong khung app, có tràn ngang, có lỗi console không. Không chạy công cụ —
// việc đó là của các script check-* trên nhánh công khai; ở đây chỉ kiểm cái khác nhau giữa hai nhánh.
//
//   THEME=dark VIEW=360x800 node scripts/doc-tools/check-app-branch.mjs
import fs from 'node:fs'
import { chromium, outDir, APP_HUB, mockSession } from './lib/qa.mjs'

const OUT = outDir('app-branch')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
/** Màn được chụp lại để NHÌN; các màn khác chỉ đo. */
const SHOTS = new Set(['', 'ky-tai-lieu', 'so-sanh-tai-lieu', 'anh-the', 'tinh-tien'])

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
await mockSession(context)
const page = await context.newPage()
let stage = 'init'
const errors = []
// Phiên giả trả 404 cho mọi API ngoài `/me`: lỗi tải tài nguyên 404 là của bản giả, không phải của app.
page.on('console', (m) => m.type() === 'error' && !/404/.test(m.text()) && errors.push(`${stage}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => errors.push(`${stage}: ${String(e)}`))

const READY = '.erp-doc-drop, .erp-doc-page, .erp-flow-picker, .erp-flow__main, .erp-tool-panel, .erp-tools-grid'
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

await page.goto(APP_HUB)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.locator('.erp-tools-grid').waitFor({ timeout: 30000 })

const base = new URL(APP_HUB).pathname
// Trang chọn chỉ bày Top 12 — danh sách đầy đủ lấy thẳng từ danh mục trong mã nguồn.
const catalog = fs.readFileSync(new URL('../../src/features/tools/hub/config/tool-list.ts', import.meta.url), 'utf8')
const slugs = [...catalog.matchAll(/^    slug: '([^']+)'/gm)].map((found) => found[1])
const out = { theme, vw, tools: slugs.length, soon: await page.locator('.erp-tool-card.is-soon').count(), hub: { overflow: await overflow(), shell: await page.locator('.erp-sidebar, .app-sidebar, aside').count() } }
await page.screenshot({ path: `${OUT}${theme}-${vw}-hub.png`, fullPage: true })

const bad = []
for (const slug of slugs) {
  stage = slug
  await page.goto(`${APP_HUB}/${slug}`)
  const ready = await page
    .locator(READY)
    .first()
    .waitFor({ timeout: 30000 })
    .then(() => true, () => false)
  await page.waitForTimeout(300)
  const row = {
    slug,
    ready,
    path: new URL(page.url()).pathname.slice(base.length),
    overflow: await overflow(),
    // Trong khung app không được hiện bìa của nhánh khách.
    guestCover: await page.locator('.erp-auth-cover, .auth-cover').count(),
    title: await page.title(),
  }
  if (!row.ready || row.overflow > 0 || row.path !== `/${slug}`) bad.push(row)
  if (SHOTS.has(slug)) await page.screenshot({ path: `${OUT}${theme}-${vw}-${slug}.png`, fullPage: true })
}

out.bad = bad
out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
