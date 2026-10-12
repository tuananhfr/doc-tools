// Chụp baseline S0 (spec v3 §13): ảnh màn hình đầu tiên + số đo cho các trang đại diện, nhiều bề rộng
// và theme. Ảnh ra QA_OUT (gitignore); metrics.json để so sau WP1 / WP2a. API bị chặn bằng phản hồi giả
// để không đếm lượt mở vào backend thật.
//
//   QA_OUT=qa-output SITE=http://localhost:3002 node scripts/doc-tools/capture-baseline.mjs
//   WIDTHS=360,390 THEMES=dark node scripts/doc-tools/capture-baseline.mjs
import fs from 'node:fs'
import path from 'node:path'
import { chromium, outDir, mockFreeSession } from './lib/qa.mjs'

const site = (process.env.SITE ?? 'http://localhost:3002').replace(/\/$/, '')
const widths = (process.env.WIDTHS ?? '360,390,768,1366').split(',').map(Number)
const themes = (process.env.THEMES ?? 'light,dark').split(',')
const height = Number(process.env.HEIGHT ?? 844)
// Trang site + một công cụ đại diện cho mỗi nhóm của spec (menu-consolidation-map.csv) + 5 trang nhóm của WP1.
// `ROUTES=/a,/b` để chụp một phần.
const PAGES = process.env.ROUTES ? process.env.ROUTES.split(',') : [
  '/', '/cong-cu', '/tai-lieu-pdf', '/xay-dung', '/gia-dinh', '/kham-pha-giai-tri',
  '/ghep-pdf', '/nen-anh', '/anh-the', '/thiet-ke-nhanh', '/tao-cv', '/tao-ma-qr',
  '/doc-to-van-ban', '/tinh-tien', '/khai-toan-nha', '/tarot',
  '/hinh-anh', '/ma-qr', '/doc-va-nghe', '/tinh-toan', '/mau-giay-to',
]
const out = outDir(process.env.OUT_NAME ?? 's0-baseline')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rows = []
const leaked = []

for (const theme of themes) {
  for (const width of widths) {
    const mobile = width < 768
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
    // Theme nằm trong store zustand persist `erpcons.app` (version 0) — phải có trước khi app hydrate.
    await context.addInitScript((t) => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme: t }, version: 0 })), theme)
    await mockFreeSession(context)
    const page = await context.newPage()
    // Mọi `/api/v1` cùng origin đã bị mock ở trên; chỉ còn bắt được lệnh gọi THẲNG sang cổng backend.
    // Fetch phía server của Next (vd. `/gioi-thieu/[site]`) không đi qua trình duyệt nên không thấy ở đây.
    page.on('request', (request) => { if (/:3003\//.test(request.url())) leaked.push(request.url()) })
    for (const route of PAGES) {
      const name = `${theme}-${width}-${route === '/' ? 'home' : route.slice(1)}`
      const row = { route, theme, width }
      try {
        await page.goto(site + route, { waitUntil: 'networkidle', timeout: 60000 })
        await page.evaluate(() => document.fonts.ready)
        // Nút chỉ báo của `next dev` không có ở bản production — không để lọt vào ảnh baseline.
        await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
        await page.waitForTimeout(400)
        Object.assign(row, await page.evaluate(measure))
        await page.screenshot({ path: path.join(out, `${name}.png`), animations: 'disabled' })
        row.screenshot = `${name}.png`
        // Trang trắng (hydrate hỏng, chunk lỗi, JSON thô) vẫn chụp được và cho số "đẹp" — tính là lỗi.
        if (!row.targetsInViewport || row.dataTheme == null) row.error = `blank page: targetsInViewport=${row.targetsInViewport}, dataTheme=${row.dataTheme}`
      } catch (error) {
        row.error = String(error)
      }
      rows.push(row)
      console.log(JSON.stringify(row))
    }
    await context.close()
  }
}
await browser.close()
fs.writeFileSync(path.join(out, 'metrics.json'), JSON.stringify({ site, createdAt: new Date().toISOString(), leaked, rows }, null, 2), 'utf8')
console.log(`metrics: ${path.join(out, 'metrics.json')} — ${rows.filter((r) => r.error).length} lỗi, ${leaked.length} request lọt ra backend`)
process.exitCode = rows.some((r) => r.error) || leaked.length ? 1 : 0

// Chạy trong trang (Playwright tuần tự hoá thân hàm) — không được dùng biến ngoài.
function measure() {
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const s = getComputedStyle(el)
    // ≤2px là ô ẩn cho trình đọc màn hình (`visually-hidden` của input tệp), không phải vùng chạm.
    return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && r.bottom > 0 && r.top < innerHeight
  }
  const targets = [...document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab]')].filter(visible)
  const small = targets.filter((el) => {
    const r = el.getBoundingClientRect()
    return r.width < 44 || r.height < 44
  })
  // Trang site cuộn trong hộp riêng, không cuộn <html> — đo cả hộp đó.
  const scroller = document.querySelector('.cn-landing-scroll, .erp-tools-guest')
  return {
    dataTheme: document.documentElement.dataset.theme ?? null,
    rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scrollerOverflow: scroller ? scroller.scrollWidth - scroller.clientWidth : null,
    bodyFontPx: parseFloat(getComputedStyle(document.body).fontSize),
    targetsInViewport: targets.length,
    targetsUnder44: small.length,
    smallExamples: small.slice(0, 5).map((el) => {
      const r = el.getBoundingClientRect()
      return `${el.tagName.toLowerCase()}${el.classList.length ? '.' + [...el.classList].join('.') : ''} ${Math.round(r.width)}x${Math.round(r.height)}`
    }),
  }
}
