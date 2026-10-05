import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('markup')

const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, acceptDownloads: true, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
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
await page.locator('input[type=file]').first().setInputFiles([FIX + 'xoay-crop.pdf', FIX + 'anh-hien-truong.jpg'])
await page.locator('.erp-doc-page').nth(3).waitFor()
await page.waitForTimeout(1500)

// Trang 2 (CropBox lệch) được người dùng xoay phải thêm 90°.
await page.locator('.erp-doc-page__select').nth(1).click()
await page.getByRole('button', { name: 'Xoay phải' }).click()
await page.keyboard.press('Escape')

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })

async function drag(tool, a, b, steps = 8) {
  if (tool) await page.getByRole('button', { name: tool, exact: true }).click()
  const box = await page.locator('.erp-doc-markup').boundingBox()
  const at = (p) => ({ x: box.x + p[0] * box.width, y: box.y + p[1] * box.height })
  const s = at(a)
  const e = at(b)
  await page.mouse.move(s.x, s.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(s.x + ((e.x - s.x) * i) / steps, s.y + ((e.y - s.y) * i) / steps)
  await page.mouse.up()
}

async function clickAt(tool, p) {
  if (tool) await page.getByRole('button', { name: tool, exact: true }).click()
  const box = await page.locator('.erp-doc-markup').boundingBox()
  await page.mouse.click(box.x + p[0] * box.width, box.y + p[1] * box.height)
}

async function markPage() {
  await drag('Khung chữ nhật', [0.1, 0.1], [0.45, 0.25])
  await drag('Mũi tên', [0.55, 0.15], [0.85, 0.3])
  await drag('Khung tròn', [0.1, 0.3], [0.4, 0.4])
  await drag('Đám mây (vùng sửa)', [0.55, 0.35], [0.9, 0.5])
  await drag('Tô sáng', [0.1, 0.5], [0.5, 0.55])
  await drag('Gạch chân', [0.1, 0.58], [0.5, 0.61])
  await drag('Gạch ngang', [0.55, 0.58], [0.9, 0.62])
  await drag('Bút', [0.1, 0.7], [0.3, 0.8], 12)
  await clickAt('Chữ', [0.55, 0.68])
  await page.keyboard.type('Sửa lại kích thước')
  await clickAt(null, [0.02, 0.98]) // lưu chữ
  await clickAt('Ghi chú', [0.55, 0.78])
  await page.keyboard.type('Thiếu chữ ký\nbên B')
  await page.keyboard.press('Control+Enter')
  await clickAt('Dấu duyệt', [0.3, 0.9])
}

// Trang 1: /Rotate 90 ở tệp nguồn.
await page.getByRole('button', { name: 'Xem to trang 1' }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await page.locator('.erp-doc-markup').waitFor()
await page.waitForTimeout(500)
await markPage()
await page.waitForTimeout(300)
await shot('p1-marked')

// Chọn khung chữ nhật, đổi màu xanh, kéo dời.
await page.getByRole('button', { name: 'Chọn / di chuyển', exact: true }).click()
const box = await page.locator('.erp-doc-markup').boundingBox()
await page.mouse.click(box.x + 0.1 * box.width, box.y + 0.17 * box.height)
await page.getByRole('button', { name: 'Màu xanh dương' }).click()
await shot('p1-selected')
const count1 = await page.locator('.erp-doc-markup > g > *').count()

// Trang 2: CropBox lệch + xoay thêm 90°.
await page.keyboard.press('Escape')
await page.getByRole('button', { name: 'Trang sau' }).click()
await page.waitForTimeout(800)
await markPage()
await page.waitForTimeout(300)
await shot('p2-marked')

// Undo một bước (dấu duyệt cuối) rồi redo.
await page.keyboard.press('Control+z')
const afterUndo = await page.locator('.erp-doc-markup > g > *').count()
await page.keyboard.press('Control+y')
const afterRedo = await page.locator('.erp-doc-markup > g > *').count()

// Esc: lần 1 thoát chế độ (không có dấu chọn), lần 2 đóng modal.
await page.keyboard.press('Escape')
const stillOpen = await page.locator('.erp-doc-preview').count()
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await shot('grid')

const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)

// Nạp lại tệp đã xuất vào công cụ để so hình: pdf.js vẽ đúng thứ đã in phẳng vào tệp.
await page.getByRole('button', { name: /Làm lại từ đầu|Bắt đầu lại|Xoá tất cả/ }).first().click().catch(() => {})
await page.waitForTimeout(300)
const confirm = page.getByRole('button', { name: 'Gỡ hết' })
if (await confirm.count()) await confirm.first().click().catch(() => {})
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 }).catch(() => {})
let reloaded = false
if (await page.getByText('Thả tệp PDF hoặc ảnh vào đây').count()) {
  await page.locator('input[type=file]').first().setInputFiles(pdfPath)
  await page.locator('.erp-doc-page').first().waitFor()
  for (const n of [1, 2]) {
    await page.getByRole('button', { name: `Xem to trang ${n}` }).click()
    await page.locator('.erp-doc-preview__canvas canvas').waitFor()
    await page.waitForTimeout(1200)
    await shot(`export-p${n}`)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
  }
  reloaded = true
}

console.log(JSON.stringify({ theme, vw, count1, afterUndo, afterRedo, stillOpen, reloaded, errors }, null, 1))
await browser.close()
