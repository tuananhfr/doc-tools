// Thanh gợi ý + lời mời đăng nhập của TRÌNH CHỈNH SỬA (`/doc-tools/chinh-sua-pdf`).
// Gợi ý chỉ còn dựa vào tệp vừa thả: việc làm nhanh theo slug (ghép, tách, ảnh -> PDF,
// PDF -> Word) đã có công cụ riêng — xem `check-flows.mjs`.
// FULL=1: thêm bước đã đăng nhập (API giả) ở nhánh trong app — xuất xong không mời đăng nhập.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE, mockSession } from './lib/qa.mjs'
// Trình chỉnh sửa TRONG khung app: cùng slug, gốc `/tools` thay cho `/doc-tools`.
const APP_BASE = BASE.replace('/doc-tools/', '/tools/')
const appRequire = createRequire(import.meta.url)
const { PDFDocument } = appRequire('pdf-lib')
const OUT = outDir('suggestions')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const full = process.env.FULL === '1'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
page.on('dialog', (d) => d.accept())
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }

async function open() {
  await page.goto(BASE)
  await page.evaluate((t) => {
    const raw = localStorage.getItem('erpcons.app')
    const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    data.state.theme = t
    localStorage.setItem('erpcons.app', JSON.stringify(data))
  }, theme)
  await page.reload()
  await page.locator('.erp-doc-drop__title').waitFor({ timeout: 30000 })
  return { title: await page.title(), drop: await page.locator('.erp-doc-drop__title').innerText() }
}
async function load(files, count) {
  await page.locator('input[type=file]').first().setInputFiles(files.map((f) => FIX + f))
  await page.locator('.erp-doc-page').nth(count - 1).waitFor({ timeout: 60000 })
  await page.waitForTimeout(600)
}
const suggestions = () => page.locator('.erp-doc-suggest__actions .btn').allInnerTexts()
const suggestion = (name) => page.locator('.erp-doc-suggest__actions .btn', { hasText: name })
async function save(click, name) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), click()])
  const p = OUT + `${theme}-${vw}-${name}`
  await dl.saveAs(p)
  return p
}

// 1. Hai PDF — ghép từ gợi ý, rồi lời mời đăng nhập dưới nút Tải PDF.
out.merge = await open()
await load(['hop-dong.pdf', 'phu-luc.pdf'], 1)
const total = await page.locator('.erp-doc-page').count()
out.merge.suggestions = await suggestions()
await page.locator('.erp-doc-suggest').scrollIntoViewIfNeeded()
await shot('merge-suggest')
const merged = await save(() => suggestion('Ghép thành 1 PDF').click(), 'merge.pdf')
out.merge.pages = `${(await PDFDocument.load(fs.readFileSync(merged))).getPageCount()}/${total}`
await page.waitForTimeout(500)
out.merge.barGone = (await page.locator('.erp-doc-suggest').count()) === 0
const nudge = page.locator('.erp-doc-nudge')
await nudge.waitFor({ timeout: 5000 })
out.merge.nudgeLink = await nudge.getByRole('link').evaluate((a) => `${a.getAttribute('href')} ${a.target}`)
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
await nudge.scrollIntoViewIfNeeded()
await shot('nudge')
await nudge.getByRole('button', { name: 'Để sau' }).click()
await save(() => page.getByRole('button', { name: /^Tải PDF/ }).click(), 'merge-again.pdf')
await page.waitForTimeout(500)
out.merge.nudgeAfterDismiss = await nudge.count()

// 2. Một PDF nhiều trang — gợi ý đầu là Tách trang, bấm → nhảy tới ô khoảng trang.
out.split = await open()
await load(['ho-so-scan.pdf'], 2)
out.split.suggestions = await suggestions()
await suggestion('Tách trang').click()
await page.waitForTimeout(600)
out.split.focused = await page.evaluate(() => document.activeElement?.getAttribute('placeholder'))
await shot('split-focus')

// 3. Chỉ ảnh — 2 ảnh thành 1 PDF.
out.image = await open()
await load(['anh-hien-truong.jpg', 'anh-van-ban.jpg'], 2)
out.image.suggestions = await suggestions()
const imgPdf = await save(() => suggestion('ảnh thành 1 PDF').click(), 'images.pdf')
out.image.pages = (await PDFDocument.load(fs.readFileSync(imgPdf))).getPageCount()

// 4. Word tải từ gợi ý, lời mời nằm dưới cặp nút Word/Excel.
out.word = await open()
await load(['hop-dong.pdf', 'bang-ke.pdf'], 2)
out.word.suggestions = await suggestions()
const docx = await save(() => suggestion('Chuyển sang Word').click(), 'word.docx')
out.word.docxBytes = fs.statSync(docx).size
await nudge.waitFor({ timeout: 5000 })
out.word.nudgeUnderWord = await nudge.evaluate((el) => !!el.closest('section')?.textContent?.includes('Tải Word'))
await nudge.scrollIntoViewIfNeeded()
await shot('nudge-word')

// 5. Ẩn gợi ý bằng X.
out.hide = await open()
await load(['hop-dong.pdf'], 1)
await page.getByRole('button', { name: 'Ẩn gợi ý' }).click()
out.hide.barAfterClose = await page.locator('.erp-doc-suggest').count()

// 6. Đã đăng nhập → xuất xong không mời.
if (full) {
  await mockSession(page)
  await page.goto(APP_BASE)
  await page.locator('.erp-doc-drop__title').waitFor()
  await load(['hop-dong.pdf'], 1)
  await save(() => page.getByRole('button', { name: /^Tải PDF/ }).click(), 'authed.pdf')
  await page.waitForTimeout(800)
  out.authedNudge = await nudge.count()
  out.authedShell = await page.locator('.erp-shell .erp-doc-tools').count()
}

out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
