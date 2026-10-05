import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const { PDFDocument } = createRequire(import.meta.url)('pdf-lib')

const OUT = outDir('image-pages')
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
await page.locator('input[type=file]').first().setInputFiles([
  FIX + 'hop-dong.pdf',
  FIX + 'xoay-crop.pdf',
  FIX + 'anh-hien-truong.jpg',
  FIX + 'anh-exif6.jpg',
  FIX + 'so-do-trong-suot.png',
])
await page.locator('.erp-doc-page').nth(17).waitFor()
await page.waitForTimeout(1200)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }
const count = () => page.locator('.erp-doc-page').count()
const origin = (n) => page.locator('.erp-doc-page__origin').nth(n - 1).innerText()
// Ảnh thu nhỏ chỉ vẽ khi thẻ trang lọt vào màn hình — phải cuộn tới rồi mới đo.
const aspect = async (n) => {
  const card = page.locator('.erp-doc-page').nth(n - 1)
  await card.scrollIntoViewIfNeeded()
  const sheet = card.locator('.erp-doc-sheet')
  await sheet.waitFor()
  return sheet.evaluate((el) => {
    const box = el.getBoundingClientRect()
    return Math.round((box.width / box.height) * 1000) / 1000
  })
}
const select = async (n) => {
  await page.locator('.erp-doc-page__select').nth(n - 1).click()
}
async function drag(a, b, steps = 10) {
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps)
  await page.mouse.up()
  await page.waitForTimeout(150)
}
async function preview(n) {
  await page.getByRole('button', { name: `Xem to trang ${n}`, exact: true }).click()
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1000)
}
const sheetBox = () => page.locator('.erp-doc-preview__sheet').boundingBox()
// Toast cũ còn trên màn hình thì getByText trúng nhiều phần tử — chờ số toast TĂNG lên.
async function toastAfter(re, action) {
  const loc = page.getByText(re)
  const before = await loc.count()
  await action()
  for (let i = 0; i < 150; i++) {
    if ((await loc.count()) > before) return
    await page.waitForTimeout(100)
  }
  throw new Error(`no toast ${re}`)
}
async function closePreview() {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}

// 1. Dấu trên trang ảnh 16 rồi đổi khổ: dấu phải đi theo ảnh.
await preview(16)
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await page.locator('.erp-doc-markup').waitFor()
await page.waitForTimeout(500)
await page.getByRole('button', { name: 'Khung chữ nhật', exact: true }).click()
let box = await sheetBox()
await drag({ x: box.x + box.width * 0.3, y: box.y + box.height * 0.4 }, { x: box.x + box.width * 0.6, y: box.y + box.height * 0.6 })
await shot('mark-a4')
await closePreview()
await closePreview()

out.aspectA4 = await aspect(16)
if (mobile) await page.getByRole('tab', { name: 'Xuất tệp' }).click()
else await page.getByRole('tab', { name: 'Xuất tệp' }).click()
await page.getByLabel('Khổ giấy').selectOption('fit')
await page.waitForTimeout(600)
await page.getByLabel('Lề').selectOption('10')
await page.waitForTimeout(1200)
out.aspectFit = await aspect(16)
out.aspectFitPng = await aspect(18)
out.aspectFitTall = await aspect(17)
await page.locator('.erp-doc-page').nth(16).screenshot({ path: `${OUT}${theme}-${vw}-thumb17.png` })
await page.locator('.erp-doc-page').nth(15).scrollIntoViewIfNeeded()
await shot('grid-fit')
await preview(16)
await shot('mark-fit')
await closePreview()

// 2. Gộp 2 ảnh: trang 16 có dấu → bỏ qua; 17 + 18 gộp.
await select(16)
await select(17)
await select(18)
out.combineEnabled = !(await page.getByRole('button', { name: 'Gộp 2 ảnh', exact: true }).isDisabled())
await page.getByRole('button', { name: 'Gộp 2 ảnh', exact: true }).click()
await page.getByText(/Đã gộp thành 1 trang/).waitFor({ timeout: 10000 })
out.combineToast = await page.getByText(/Đã gộp thành/).innerText()
await page.waitForTimeout(800)
out.afterCombine = await count()
out.collageOrigin = await origin(17)
await page.keyboard.press('Escape')
await page.locator('.erp-doc-page').nth(16).scrollIntoViewIfNeeded()
await page.waitForTimeout(600)
await shot('grid-combined')
await preview(17)
out.cropOnCollage = await page.getByRole('button', { name: 'Cắt trang', exact: true }).count()
await shot('collage-preview')
await closePreview()

// 3. Cắt trang PDF 1: giữ khoảng giữa trang (có dòng tiêu đề).
await preview(1)
await page.getByRole('button', { name: 'Cắt trang', exact: true }).click()
await page.waitForTimeout(400)
box = await sheetBox()
await drag({ x: box.x + box.width * 0.1, y: box.y + box.height * 0.3 }, { x: box.x + box.width * 0.9, y: box.y + box.height * 0.8 })
await shot('crop-drawn')
const before = await sheetBox()
await toastAfter(/Đã cắt trang/, () => page.getByRole('button', { name: 'Cắt trang', exact: true }).last().click())
await page.waitForTimeout(1200)
const after = await sheetBox()
out.cropAspect = Math.round((after.width / after.height) * 100) / 100
out.cropTitle = await page.locator('.erp-doc-preview__origin').innerText()
await shot('crop-done')
await closePreview()

// 4. Cắt trang có /Rotate + xoay thêm (trang 13: xoay-crop tr 1 = /Rotate 90).
await select(13)
await page.getByRole('button', { name: 'Xoay phải' }).click()
await page.keyboard.press('Escape')
await preview(13)
await shot('rot-before')
await page.getByRole('button', { name: 'Cắt trang', exact: true }).click()
await page.waitForTimeout(400)
box = await sheetBox()
await drag({ x: box.x + box.width * 0.4, y: box.y + box.height * 0.85 }, { x: box.x + box.width * 0.995, y: box.y + box.height * 0.995 })
await toastAfter(/Đã cắt trang/, () => page.keyboard.press('Enter'))
await page.waitForTimeout(1200)
await shot('rot-crop')
await closePreview()

// 5. Cắt trang ảnh 16 (khổ vừa ảnh + lề 10): dấu vẫn trên ảnh.
await preview(16)
await page.getByRole('button', { name: 'Cắt trang', exact: true }).click()
await page.waitForTimeout(400)
box = await sheetBox()
await drag({ x: box.x + box.width * 0.2, y: box.y + box.height * 0.2 }, { x: box.x + box.width * 0.8, y: box.y + box.height * 0.8 })
await toastAfter(/Đã cắt trang/, () => page.keyboard.press('Enter'))
await page.waitForTimeout(1200)
out.imageCropOrigin = await page.locator('.erp-doc-preview__origin').innerText()
await shot('img-crop')
await closePreview()

// 6. Tìm chữ trên trang đã cắt vẫn ra (lớp chữ theo nguồn mới).
await page.keyboard.press('Control+f')
await page.getByRole('searchbox', { name: 'Tìm trong tài liệu' }).fill('trang 1/12')
await page.waitForTimeout(1500)
out.searchCropped = await page.locator('.erp-doc-search__status').innerText()
await page.getByRole('searchbox', { name: 'Tìm trong tài liệu' }).press('Enter')
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1200)
await shot('crop-search')
await closePreview()

// 7. Hoàn tác cắt ảnh rồi làm lại.
await page.locator('body').click({ position: { x: 5, y: 5 } })
await page.keyboard.press('Control+z')
await page.waitForTimeout(500)
out.undoOrigin = await origin(16)
await page.keyboard.press('Control+y')
await page.waitForTimeout(500)
out.redoOrigin = await origin(16)

// 8. Xuất PDF, đọc lại bằng pdf-lib, nạp lại xem hình.
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)
const doc = await PDFDocument.load(fs.readFileSync(pdfPath))
out.exportPages = doc.getPageCount()
out.exportSizes = [1, 13, 16, 17].map((n) => {
  const p = doc.getPage(n - 1)
  const c = p.getCropBox()
  return { n, w: Math.round(c.width), h: Math.round(c.height), rot: p.getRotation().angle }
})
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
await page.getByRole('button', { name: 'Gỡ hết' }).first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles(pdfPath)
await page.locator('.erp-doc-page').nth(16).waitFor()
for (const n of [1, 13, 16, 17]) {
  await preview(n)
  await shot(`export-p${n}`)
  await closePreview()
}
out.errors = errors
console.log(JSON.stringify(out))
await browser.close()
