import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('textbox-resize')

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
await page.locator('input[type=file]').first().setInputFiles([FIX + 'xoay-crop.pdf'])
await page.locator('.erp-doc-page').first().waitFor()
await page.waitForTimeout(1200)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const layer = () => page.locator('.erp-doc-markup')
const textCount = () => page.locator('.erp-doc-markup text').count()

async function clickAt(tool, p) {
  if (tool) await page.getByRole('button', { name: tool, exact: true }).click()
  const box = await layer().boundingBox()
  await page.mouse.click(box.x + p[0] * box.width, box.y + p[1] * box.height)
}

async function dragHandleTo(xFraction) {
  const handle = page.locator('.erp-doc-markup__handle').first()
  const h = await handle.boundingBox()
  const box = await layer().boundingBox()
  const sx = h.x + h.width / 2
  const sy = h.y + h.height / 2
  const ex = box.x + xFraction * box.width
  await page.mouse.move(sx, sy)
  await page.mouse.down()
  for (let i = 1; i <= 10; i++) await page.mouse.move(sx + ((ex - sx) * i) / 10, sy)
  await page.mouse.up()
}

const LONG = 'Đề nghị nhà thầu bổ sung hồ sơ năng lực và biên bản nghiệm thu vật liệu đầu vào'

// Trang 1 của tệp có /Rotate 90.
await page.getByRole('button', { name: 'Xem to trang 1' }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await layer().waitFor()
await page.waitForTimeout(400)

await clickAt('Chữ', [0.08, 0.2])
await page.keyboard.type(LONG)
await clickAt(null, [0.02, 0.98])
await page.waitForTimeout(200)
const linesPlaced = await textCount()

// Chọn rồi kéo tay nắm cạnh phải vào giữa trang → chữ tự xuống dòng.
await page.getByRole('button', { name: 'Chọn / di chuyển', exact: true }).click()
await clickAt(null, [0.12, 0.215])
const handles = await page.locator('.erp-doc-markup__handle').count()
await dragHandleTo(0.45)
await page.waitForTimeout(200)
const linesNarrow = await textCount()
await shot('narrow')

// Gõ thêm: khung giữ bề rộng đã kéo, ô gõ cũng xuống dòng.
const selBox = await page.locator('.erp-doc-markup__outline').boundingBox()
await page.mouse.dblclick(selBox.x + 10, selBox.y + 6)
const wrappedInput = await page.locator('.erp-doc-markup__input.is-wrapped').count()
await page.keyboard.press('End')
await page.keyboard.press('Control+End')
await page.keyboard.type(' tại công trường')
await shot('editing')
await page.keyboard.press('Control+Enter')
await page.waitForTimeout(200)
const linesRetyped = await textCount()
const outlineAfter = await page.locator('.erp-doc-markup__outline').boundingBox().catch(() => null)

// Hoàn tác lần sửa chữ rồi lần kéo: về 1 dòng.
await page.keyboard.press('Control+z')
await page.keyboard.press('Control+z')
await page.waitForTimeout(200)
const linesUndo = await textCount()
await page.keyboard.press('Control+y')
await page.keyboard.press('Control+y')
await page.waitForTimeout(200)
const linesRedo = await textCount()

// Ghi chú: kéo rộng ra cho hai dòng gộp thành một.
await clickAt('Ghi chú', [0.08, 0.6])
await page.keyboard.type('Thiếu chữ ký bên B và dấu đỏ của đơn vị tư vấn giám sát')
await page.keyboard.press('Control+Enter')
await page.getByRole('button', { name: 'Chọn / di chuyển', exact: true }).click()
await clickAt(null, [0.1, 0.615])
const noteBefore = await textCount()
await dragHandleTo(0.3)
await page.waitForTimeout(200)
const noteNarrow = await textCount()
await shot('note')

await page.keyboard.press('Escape')
await page.keyboard.press('Escape')
await page.keyboard.press('Escape')
await page.waitForTimeout(400)
await shot('grid')

const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)

// Nạp lại tệp đã xuất: chữ in phẳng phải tìm được, và nhìn đúng chỗ.
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
const confirm = page.getByRole('button', { name: 'Gỡ hết' })
if (await confirm.count()) await confirm.first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles(pdfPath)
await page.locator('.erp-doc-page').first().waitFor()
await page.waitForTimeout(1000)
await page.getByRole('button', { name: 'Xem to trang 1' }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1200)
await shot('reimport')
await page.keyboard.press('Escape')
await page.keyboard.press('Control+f')
await page.getByRole('searchbox').first().fill('công trường')
await page.waitForTimeout(1500)
const found = await page.locator('.erp-doc-search__status').first().innerText().catch(() => '')

console.log(JSON.stringify({ theme, vw, linesPlaced, handles, linesNarrow, wrappedInput, linesRetyped, outlineW: outlineAfter?.width, linesUndo, linesRedo, noteBefore, noteNarrow, found, errors }, null, 1))
await browser.close()
