import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { unzipSync, strFromU8 } = appRequire('fflate')

const OUT = outDir('ocr')
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

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'scan-van-ban.pdf', FIX + 'hop-dong.pdf', FIX + 'anh-van-ban.jpg'])
await page.locator('.erp-doc-page').nth(14).waitFor({ timeout: 60000 })
await page.waitForTimeout(1000)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }

// Trang 2 là bản scan nằm ngang — xoay phải cho chữ đứng rồi mới nhận dạng.
await page.locator('.erp-doc-page__select').nth(1).click()
await page.getByRole('button', { name: /Xoay phải/ }).first().click()
await page.getByRole('button', { name: /Bỏ chọn|Chọn tất cả/ }).first().waitFor()
await page.locator('.erp-doc-page__select').nth(1).click()
await page.waitForTimeout(500)

await page.getByRole('tab', { name: 'Tìm' }).click()
const input = page.getByRole('searchbox', { name: 'Tìm trong tài liệu' })
await input.fill('Xi măng')
await page.getByText(/trang không có lớp chữ/).waitFor({ timeout: 30000 })
out.textlessNote = await page.getByText(/trang không có lớp chữ/).innerText()
await page.locator('.erp-doc-ocr').scrollIntoViewIfNeeded()
await shot('ocr-idle')

const start = Date.now()
const toast = page.getByText(/Đã nhận dạng \d+ trang/)
await page.getByRole('button', { name: /Nhận dạng chữ \(OCR\)/ }).click()
await page.locator('.erp-doc-ocr__running').waitFor({ timeout: 10000 })
await page.waitForTimeout(1500)
await page.locator('.erp-doc-ocr').scrollIntoViewIfNeeded()
await shot('ocr-running')
out.runningText = await page.locator('.erp-doc-ocr__status').innerText()
await toast.waitFor({ timeout: 300000 })
out.ocrSeconds = Math.round((Date.now() - start) / 1000)
out.ocrToast = await toast.innerText()

// Tìm lại: bản scan + trang ngang đã xoay + ảnh đều phải ra kết quả.
await page.waitForTimeout(1500)
out.statusAfter = await page.locator('.erp-doc-search__status').innerText()
out.hitPages = await page.locator('.erp-doc-search__page').allInnerTexts()
out.noteAfter = await page.getByText(/trang không có lớp chữ/).count()
await shot('search-after')

// Mở kết quả trên trang xoay: ô vàng phải nằm đúng chữ.
const hit2 = page.locator('.erp-doc-search__page', { hasText: 'Trang 2' })
if (await hit2.count()) {
  await page.locator('.erp-doc-search__page:has-text("Trang 2") + li .erp-doc-search__hit').first().click()
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1500)
  await shot('hit-rotated')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}
await page.locator('.erp-doc-search__page:has-text("Trang 15") + li .erp-doc-search__hit').first().click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1500)
await shot('hit-image')
// Công cụ tô bám dòng trên chữ OCR: kéo ngang qua đúng chỗ ô vàng của kết quả tìm.
const hl = page.locator('.erp-doc-hits > *').first()
let hlBox = (await hl.count()) ? await hl.boundingBox() : null
out.hitBox = hlBox
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await page.locator('.erp-doc-markup').waitFor()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'Tô sáng', exact: true }).click()
if (!hlBox) {
  const sheet = await page.locator('.erp-doc-markup').boundingBox()
  hlBox = { x: sheet.x + sheet.width * 0.1, y: sheet.y + sheet.height * 0.3, width: sheet.width * 0.3, height: 10 }
}
await page.mouse.move(hlBox.x + 2, hlBox.y + hlBox.height / 2)
await page.mouse.down()
for (let i = 1; i <= 8; i++) await page.mouse.move(hlBox.x + 2 + (hlBox.width * i) / 8, hlBox.y + hlBox.height / 2)
await page.mouse.up()
await page.waitForTimeout(300)
await shot('highlight-ocr')
out.highlightShapes = await page.locator('.erp-doc-markup > g > *').count()
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// Xuất PDF → nạp lại → tìm được chữ mà không cần OCR lần nữa.
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: /^Tải PDF/ }).click()])
const pdfPath = OUT + `${theme}-${vw}-ocr.pdf`
await dl.saveAs(pdfPath)
out.pdfBytes = fs.statSync(pdfPath).size

if (full) {
  const [wd] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: 'Tải Word' }).click()])
  const docx = OUT + `${theme}-${vw}-ocr.docx`
  await wd.saveAs(docx)
  const xml = strFromU8(unzipSync(fs.readFileSync(docx))['word/document.xml'])
  const words = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]).join('')
  // Cả 3 trang OCR (có trang đã xoay) phải ra chữ có dấu cách như thường.
  out.docxOcrPages = (words.match(/Căn cứ hợp đồng/g) ?? []).length
  out.docxDrawings = (xml.match(/<w:drawing>/g) ?? []).length
}

await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([pdfPath])
await page.locator('.erp-doc-page').nth(14).waitFor({ timeout: 60000 })
await page.getByRole('tab', { name: 'Tìm' }).click()
await page.getByRole('searchbox', { name: 'Tìm trong tài liệu' }).fill('Xi măng')
await page.getByText(/kết quả trên|Không tìm thấy/).first().waitFor({ timeout: 30000 })
await page.waitForTimeout(800)
out.reimportStatus = await page.locator('.erp-doc-search__status').innerText()
out.reimportPages = await page.locator('.erp-doc-search__page').allInnerTexts()
await page.locator('.erp-doc-search__hit').first().click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1500)
await shot('reimport-hit')

out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
