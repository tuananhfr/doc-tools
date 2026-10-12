// Gate a11y nền (spec v3 §04, UI01 / UI02 / CN-004): vùng chạm, tràn ngang, tương phản WCAG AA, viền
// focus khi dùng bàn phím, và chữ phóng 200% không cắt nút chính / nút Tải. Chạy trên Chrome thật,
// mọi `/api/v1/**` bị chặn bằng phản hồi giả (không ghi lượt mở vào backend).
//
//   QA_OUT=qa-output node scripts/doc-tools/check-a11y.mjs
//   WIDTHS=360 THEMES=dark PAGES=/,/cong-cu node scripts/doc-tools/check-a11y.mjs
//   TEXT_SIZE=large WIDTHS=360 THEMES=light node scripts/doc-tools/check-a11y.mjs   # chế độ "Chữ lớn"
//
// Luật: body-font (chữ thân 16px, 18px khi TEXT_SIZE=large) · overflow · target (<44px; P0 chỉ ở
// bề rộng ≤ 430px, rộng hơn là P1) · contrast (WCAG AA 4.5:1, chữ lớn 3:1) · focus (Tab không thấy viền)
// · clip-200 (chữ phóng 200% cắt nút chính) · export-visible (nút Tải không thấy khi có kết quả).
// Miễn trừ CỐ Ý: link nằm trong câu chữ (WCAG 2.5.8), ô tick đo theo nhãn bao quanh, phần tử bị
// disabled / aria-hidden. Không nới ngưỡng hay thêm miễn trừ để cho gate xanh.
// Exit 0 = không có P0, 1 = có P0, 2 = có trang không mở được.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, outDir, mockFreeSession } from './lib/qa.mjs'
import { contrastRatio, flattenBackground, requiredContrast } from '../../src/utils/contrast.ts'

const site = (process.env.SITE ?? 'http://localhost:3002').replace(/\/$/, '')
const widths = (process.env.WIDTHS ?? '360,390,430').split(',').map(Number)
const themes = (process.env.THEMES ?? 'light,dark,field').split(',')
const height = Number(process.env.HEIGHT ?? 844)
const PAGES = (process.env.PAGES ?? [
  '/', '/cong-cu', '/tai-lieu-pdf', '/xay-dung', '/gia-dinh', '/kham-pha-giai-tri',
  '/ghep-pdf', '/nen-anh', '/anh-the', '/thiet-ke-nhanh', '/tao-cv', '/tao-ma-qr',
  '/doc-to-van-ban', '/tinh-tien', '/khai-toan-nha', '/tarot',
].join(',')).split(',')
const RESULT_ROUTE = process.env.RESULT_ROUTE ?? '/nen-anh'
const TAP = 44
const MOBILE_MAX = 430
// Q6: chữ thân 16px mặc định, 18px khi người dùng bật "Chữ lớn" (localStorage `cn.textSize`).
const LARGE = process.env.TEXT_SIZE === 'large'
const BODY_PX = LARGE ? 18 : 16
const out = outDir(process.env.OUT_NAME ?? 'a11y')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rows = []

for (const theme of themes) {
  for (const width of widths) {
    const mobile = width < 768
    const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
    await context.addInitScript((t) => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme: t }, version: 0 })), theme)
    if (LARGE) await context.addInitScript(() => localStorage.setItem('cn.textSize', 'large'))
    await mockFreeSession(context)
    const page = await context.newPage()
    for (const route of PAGES) rows.push(await auditPage(page, route, theme, width))
    rows.push(await auditResult(page, theme, width))
    await context.close()
  }
}
await browser.close()

const issues = rows.flatMap((row) => (row.issues ?? []).map((issue) => ({ ...issue, route: row.route, theme: row.theme, width: row.width, mode: row.mode })))
const byRule = {}
for (const issue of issues) byRule[`${issue.severity}:${issue.rule}`] = (byRule[`${issue.severity}:${issue.rule}`] ?? 0) + 1
const summary = { p0: issues.filter((i) => i.severity === 'P0').length, p1: issues.filter((i) => i.severity === 'P1').length, errors: rows.filter((r) => r.error).length, byRule }
fs.writeFileSync(path.join(out, 'a11y.json'), JSON.stringify({ site, createdAt: new Date().toISOString(), summary, rows }, null, 2), 'utf8')
console.log(JSON.stringify(summary))
console.log(`a11y: ${path.join(out, 'a11y.json')}`)
process.exitCode = summary.errors ? 2 : summary.p0 ? 1 : 0

async function open(page, route) {
  await page.goto(site + route, { waitUntil: 'networkidle', timeout: 90000 })
  await page.evaluate(() => document.fonts.ready)
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await page.waitForTimeout(300)
}

async function auditPage(page, route, theme, width) {
  const row = { route, theme, width, mode: 'normal', issues: [] }
  try {
    await open(page, route)
    const data = await page.evaluate(collect)
    row.issues.push(...judge(data, width))
    row.issues.push(...(await focusIssues(page)))
    if (width === widths[0] && theme === themes[0]) {
      await page.evaluate(scaleText)
      await page.waitForTimeout(200)
      const scaled = await page.evaluate(collectClipping)
      row.issues.push(...scaled.map((detail) => ({ rule: 'clip-200', severity: 'P0', ...detail })))
    }
  } catch (error) {
    row.error = String(error)
  }
  return row
}

// Nút Tải phải nhìn thấy ngay khi có kết quả (spec "Sticky export"), kể cả khi chữ phóng 200%.
async function auditResult(page, theme, width) {
  const row = { route: `${RESULT_ROUTE}#result`, theme, width, mode: 'result', issues: [] }
  try {
    await open(page, RESULT_ROUTE)
    const png = await page.screenshot({ clip: { x: 0, y: 0, width: 200, height: 200 } })
    await page.locator('input[type=file]').first().setInputFiles({ name: 'mau.png', mimeType: 'image/png', buffer: png })
    const run = page.locator('.erp-flow__run').first()
    await run.waitFor({ state: 'visible', timeout: 30000 })
    await run.click()
    const download = page.locator('.erp-flow-result__download')
    await download.waitFor({ state: 'attached', timeout: 60000 })
    await page.waitForTimeout(300)
    const check = async (mode) => {
      const box = await page.evaluate(() => {
        const el = document.querySelector('.erp-flow-result__download')
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, clipped: el.scrollWidth > el.clientWidth + 1, vw: innerWidth, vh: innerHeight }
      })
      const visible = box.top >= 0 && box.bottom <= box.vh && box.left >= -1 && box.right <= box.vw + 1
      if (!visible) row.issues.push({ rule: 'export-visible', severity: 'P0', selector: '.erp-flow-result__download', detail: `${mode} ${Math.round(box.left)},${Math.round(box.top)}→${Math.round(box.right)},${Math.round(box.bottom)} trong ${box.vw}x${box.vh}` })
      if (box.clipped) row.issues.push({ rule: 'clip-200', severity: 'P0', selector: '.erp-flow-result__download', detail: `${mode} chữ bị cắt` })
    }
    // Cuộn hộp cuộn công cụ về đầu: nút Tải vẫn phải thấy được nhờ dính đáy.
    await page.evaluate(() => { const s = document.querySelector('.erp-tools-guest'); if (s) s.scrollTop = 0 })
    await check('normal')
    if (width === widths[0] && theme === themes[0]) {
      await page.evaluate(scaleText)
      await page.waitForTimeout(200)
      await page.evaluate(() => { const s = document.querySelector('.erp-tools-guest'); if (s) s.scrollTop = 0 })
      await check('text200')
    }
  } catch (error) {
    row.error = String(error)
  }
  return row
}

function judge(data, width) {
  const issues = []
  if (data.bodyFontPx !== BODY_PX || (LARGE && data.textSize !== 'large')) issues.push({ rule: 'body-font', severity: 'P0', selector: 'body', detail: `${data.bodyFontPx}px (cần ${BODY_PX}px), data-text-size=${data.textSize}` })
  if (data.rootOverflow > 0 || (data.scrollerOverflow ?? 0) > 0) issues.push({ rule: 'overflow', severity: 'P0', selector: 'page', detail: `root ${data.rootOverflow}px, scroller ${data.scrollerOverflow}px` })
  for (const target of data.targets) {
    if (target.w >= TAP && target.h >= TAP) continue
    issues.push({ rule: 'target', severity: width <= MOBILE_MAX ? 'P0' : 'P1', selector: target.selector, detail: `${target.w}x${target.h}` })
  }
  for (const text of data.texts) {
    if (text.unknownBg) continue
    const ratio = contrastRatio(text.fg, flattenBackground(text.bgs))
    const need = requiredContrast(text.fontPx, text.weight)
    if (ratio + 0.005 < need) issues.push({ rule: 'contrast', severity: 'P0', selector: text.selector, detail: `${ratio.toFixed(2)} < ${need} "${text.sample}"` })
  }
  return issues
}

async function focusIssues(page) {
  const issues = []
  const seen = new Set()
  await page.evaluate(() => { document.activeElement?.blur?.(); window.scrollTo(0, 0) })
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab')
    const info = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      // Ô nhập trong khung tìm kiếm vẽ viền ở khung cha (`:focus-within`) — xét tới 3 cấp tổ tiên.
      let visible = false
      for (let node = el, depth = 0; node && depth < 4 && !visible; node = node.parentElement, depth += 1) {
        const s = getComputedStyle(node)
        visible = (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2) || (depth === 0 && s.boxShadow !== 'none')
      }
      const name = el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '')
      return { name, visible }
    })
    if (!info || seen.has(info.name)) continue
    seen.add(info.name)
    if (!info.visible) issues.push({ rule: 'focus', severity: 'P0', selector: info.name, detail: 'không thấy viền focus' })
  }
  return issues
}

// Giả lập chữ phóng 200% của hệ điều hành: nhân đôi cỡ chữ đã tính của MỌI phần tử (kể cả cỡ px).
function scaleText() {
  const all = [...document.querySelectorAll('body *')]
  const sizes = all.map((el) => parseFloat(getComputedStyle(el).fontSize))
  all.forEach((el, i) => el.style.setProperty('font-size', `${sizes[i] * 2}px`, 'important'))
}

function collectClipping() {
  const name = (el) => el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '')
  const ctas = [...document.querySelectorAll('.erp-flow__run, .erp-flow-result__download, .cn-button, .btn-primary')]
    .filter((el) => el.checkVisibility() && el.getBoundingClientRect().width > 2)
  const issues = []
  for (const el of ctas) {
    const r = el.getBoundingClientRect()
    if (el.scrollWidth > el.clientWidth + 1) issues.push({ selector: name(el), detail: `chữ bị cắt ${el.scrollWidth}>${el.clientWidth}` })
    else if (r.left < -1 || r.right > innerWidth + 1) issues.push({ selector: name(el), detail: `ra ngoài màn hình ${Math.round(r.left)}→${Math.round(r.right)}` })
  }
  return issues
}

// Chạy trong trang — không dùng biến ngoài.
function collect() {
  const name = (el) => el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '') + (el.id ? '#' + el.id : '')
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 1
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const cache = new Map()
  // Chuẩn hoá mọi cú pháp màu (rgb, color(srgb …), color-mix…) qua một điểm ảnh canvas.
  const rgba = (css) => {
    if (cache.has(css)) return cache.get(css)
    ctx.clearRect(0, 0, 1, 1)
    ctx.fillStyle = '#000'
    ctx.fillStyle = css
    ctx.fillRect(0, 0, 1, 1)
    const d = ctx.getImageData(0, 0, 1, 1).data
    const value = [d[0], d[1], d[2], d[3] / 255]
    cache.set(css, value)
    return value
  }
  const shown = (el) => {
    const r = el.getBoundingClientRect()
    // Skip link nằm ngoài mép trên tới khi được focus — không phải thứ người dùng thấy/chạm.
    if (r.bottom + scrollY <= 0 || r.right + scrollX <= 0) return false
    return r.width > 2 && r.height > 2 && el.checkVisibility({ opacityProperty: true, visibilityProperty: true })
  }
  const targets = []
  for (const el of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab]')) {
    if (!shown(el)) continue
    const s = getComputedStyle(el)
    // WCAG 2.5.8: link nằm trong câu chữ được miễn — vùng chạm là cả dòng.
    if (el.tagName === 'A' && s.display === 'inline') {
      const block = el.parentElement
      if (block && block.textContent.trim().length > el.textContent.trim().length + 1) continue
    }
    // Ô tick / radio: vùng chạm là nhãn bao quanh (hoặc khung .form-check).
    let box = el.getBoundingClientRect()
    if (el.type === 'checkbox' || el.type === 'radio') {
      const holder = el.closest('label, .form-check') ?? (el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null)
      if (holder) box = holder.getBoundingClientRect()
    }
    targets.push({ selector: name(el), w: Math.round(box.width), h: Math.round(box.height) })
  }
  const texts = []
  for (const el of document.querySelectorAll('body *')) {
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim()
    if (!own || !shown(el)) continue
    if (el.closest(':disabled, [aria-disabled="true"], [aria-hidden="true"], .visually-hidden, nextjs-portal')) continue
    const s = getComputedStyle(el)
    let fg = rgba(s.color)
    let opacity = 1
    for (let node = el; node; node = node.parentElement) opacity *= parseFloat(getComputedStyle(node).opacity)
    fg = [fg[0], fg[1], fg[2], fg[3] * opacity]
    const bgs = []
    let unknownBg = false
    for (let node = el; node; node = node.parentElement) {
      const ns = getComputedStyle(node)
      if (ns.backgroundImage !== 'none') { unknownBg = true; break }
      const bg = rgba(ns.backgroundColor)
      bgs.push(bg)
      if (bg[3] >= 1) break
    }
    texts.push({ selector: name(el), sample: own.slice(0, 40), fg, bgs, unknownBg, fontPx: parseFloat(s.fontSize), weight: Number(s.fontWeight) || 400 })
  }
  const scroller = document.querySelector('.cn-landing-scroll, .erp-tools-guest')
  return {
    bodyFontPx: parseFloat(getComputedStyle(document.body).fontSize),
    textSize: document.documentElement.dataset.textSize ?? null,
    rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    scrollerOverflow: scroller ? scroller.scrollWidth - scroller.clientWidth : null,
    targets,
    texts,
  }
}
