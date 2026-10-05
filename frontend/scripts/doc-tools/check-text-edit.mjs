import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('text-edit')
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
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf', FIX + 'xoay-crop.pdf'])
await page.locator('.erp-doc-page').nth(14).waitFor()
await page.waitForTimeout(1000)
await page.locator('.erp-doc-page__select').nth(13).click()
await page.getByRole('button', { name: 'Xoay phải' }).click()
await page.keyboard.press('Escape')

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const shapes = () => page.locator('.erp-doc-markup > g > *').count()
const out = { theme, vw }

async function openAt(query) {
  await page.keyboard.press('Control+f')
  const input = page.getByRole('searchbox', { name: 'Tìm trong tài liệu' })
  await input.fill(query)
  await page.waitForTimeout(700)
  await page.waitForFunction(() => document.querySelector('.erp-doc-search__hit'), null, { timeout: 30000 })
  await input.press('Enter')
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
  await page.locator('.erp-doc-markup').waitFor()
  await page.waitForTimeout(600)
  // Đo SAU khi bật Đánh dấu: thanh công cụ dấu chen vào đẩy trang xuống.
  return page.locator('.erp-doc-hits polygon.is-active').boundingBox()
}

async function tool(name) {
  await page.getByRole('button', { name, exact: true }).click()
}

async function drag(a, b, steps = 10) {
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps)
  await page.mouse.up()
  await page.waitForTimeout(150)
}

async function close() {
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}


async function clickAt(p) {
  await page.mouse.click(p.x, p.y)
  await page.waitForTimeout(150)
}
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
const EDITED = 'Gói thầu XL-04 · Khu điều hành dự án mở rộng giai đoạn hai, bổ sung nhà xe và tường rào phía đông'

/** Chờ trang được viết lại xong (PDFium + vẽ lại trang). */
async function rewritten() {
  await page.waitForFunction(() => !document.querySelector('.erp-doc-markup[aria-busy]'), null, { timeout: 30000 })
  await page.waitForTimeout(1200)
}

// Sửa một dòng: bấm giữa dòng → ô gõ đè đúng chỗ, mang chữ gốc.
const g = await openAt('Gói thầu')
// Thanh dấu phải cao như nhau với mọi công cụ: cao thêm là cả trang nhảy, điểm vừa đo lệch chỗ.
const barHeights = new Set()
for (const name of ['Bút', 'Chữ', 'Dấu duyệt', 'Xoá thật', 'Sửa chữ']) {
  const button = page.getByRole('button', { name, exact: true })
  await button.scrollIntoViewIfNeeded()
  await button.click()
  barHeights.add(Math.round((await page.locator('.erp-doc-markbar').boundingBox()).height))
}
out.barHeights = [...barHeights]
await clickAt(center(g))
const input = page.getByRole('textbox', { name: 'Chữ thay thế' })
await input.waitFor({ timeout: 10000 })
out.original = await input.inputValue()
// Chữ sửa lại gõ bằng phông cùng bề rộng với phông gốc (Arimo/Tinos), không phải phông con dấu.
out.inputFont = await input.evaluate((el) => getComputedStyle(el).fontFamily)
// Trang PDF có chữ thật: sửa là VIẾT LẠI trang, không còn lời nhắc "chỉ che bề mặt".
out.editNotice = await page.locator('.erp-doc-markbar__notice').count()
await shot('edit-open')
await input.fill(EDITED)
await page.waitForTimeout(200)
out.typingLines = await input.evaluate((el) => Math.round(el.scrollHeight / parseFloat(getComputedStyle(el).lineHeight)))
await shot('edit-typing')
const sheet = await page.locator('.erp-doc-markup').boundingBox()
await clickAt({ x: sheet.x + sheet.width * 0.5, y: sheet.y + sheet.height * 0.9 })
await rewritten()
// Không thêm dấu phủ nào: chữ mới nằm thẳng trong nội dung trang.
out.afterEdit = await shapes()
await shot('edit-done')

// Chữ vừa viết bấm vào sửa tiếp được như chữ gốc; Esc là bỏ.
await clickAt(center(g))
const again = page.getByRole('textbox', { name: 'Chữ thay thế' })
await again.waitFor({ timeout: 10000 })
out.reedit = await again.inputValue()
await page.keyboard.press('Escape')

// Hoàn tác trả lại trang cũ, làm lại đưa về trang đã viết.
const bar = page.locator('.erp-doc-markbar')
await bar.getByRole('button', { name: 'Hoàn tác', exact: true }).click()
await page.waitForTimeout(1200)
await clickAt(center(g))
await again.waitFor({ timeout: 10000 })
out.undone = await again.inputValue()
await page.keyboard.press('Escape')
await bar.getByRole('button', { name: 'Làm lại', exact: true }).click()
await page.waitForTimeout(1200)

// Che chữ: kéo qua dòng "Tiếng Việt".
const t = await (async () => {
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  return openAt('Tiếng Việt')
})()
await tool('Che chữ')
await drag({ x: t.x + 1, y: t.y + t.height / 2 }, { x: t.x + t.width * 3, y: t.y + t.height / 2 })
await page.waitForTimeout(800)
out.afterCover = await shapes()
await shot('cover-done')
await close()

for (const [name, query] of [
  ['rotate', 'top of unrotated'],
  ['crop', 'CROPBOX 50,60'],
]) {
  const b = await openAt(query)
  await tool('Sửa chữ')
  await clickAt(center(b))
  const field = page.getByRole('textbox', { name: 'Chữ thay thế' })
  await field.waitFor({ timeout: 10000 })
  out[name + 'Original'] = await field.inputValue()
  await shot(`${name}-open`)
  await field.fill(name === 'rotate' ? 'ĐÃ SỬA dòng xoay 90' : 'ĐÃ SỬA vùng cắt')
  await page.keyboard.press('Control+Enter')
  await rewritten()
  out[name] = await shapes()
  await shot(`${name}-done`)
  await close()
}


// Tìm & thay: không chọn sẵn; chọn 2 chỗ (trang 4, 5 — trang 1 đã sửa thành XL-04 nên không còn trong kết quả) → thay, một bước hoàn tác.
await page.keyboard.press('Control+f')
const box = page.getByRole('searchbox', { name: 'Tìm trong tài liệu' })
await box.fill('XL-03')
await page.waitForTimeout(1500)
await page.getByLabel('Thay thế').check()
await page.getByLabel('Thay bằng').fill('XL-03-B (điều chỉnh)')
await page.waitForTimeout(300)
out.preselected = await page.locator('.erp-doc-search__pick input:checked').count()
out.applyDisabled = await page.getByRole('button', { name: /Thay 0 chỗ đã chọn/ }).isDisabled()
out.longFlags = await page.locator('.erp-doc-search__flag.is-warn').count()
const picks = page.locator('.erp-doc-search__pick input')
await picks.nth(2).check()
await picks.nth(3).check()
await shot('replace-panel')
const stamps = () => page.locator('.erp-doc-page .erp-doc-stamp').count()
const before = await stamps()
await page.getByRole('button', { name: /Thay 2 chỗ đã chọn/ }).click()
await page.getByText(/Đã thay 2 chỗ/).waitFor({ timeout: 15000 })
await page.waitForTimeout(400)
out.replacedStamps = (await stamps()) - before
out.doneFlags = await page.locator('.erp-doc-search__flag.is-done').count()
await shot('replace-done')
await page.locator('body').click({ position: { x: 5, y: 5 } })
await page.keyboard.press('Control+z')
await page.waitForTimeout(300)
out.undoStamps = (await stamps()) - before
await page.keyboard.press('Control+y')
await page.waitForTimeout(300)
out.redoStamps = (await stamps()) - before
await page.getByRole('button', { name: 'Xem to trang 4', exact: true }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1200)
await shot('replace-p4')
// Chữ thay bằng Tìm & thay vẫn là dấu phủ: chọn được, kéo tay nắm cuối dòng cho hẹp lại → tự xuống dòng.
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await page.locator('.erp-doc-markup').waitFor()
await tool('Chọn / di chuyển')
out.surfaceNotice = 0
const mark = await page.locator('.erp-doc-markup > g > *').first().boundingBox()
await clickAt(center(mark))
out.surfaceNotice = await page.locator('.erp-doc-markbar__notice').count()
out.handles = await page.locator('.erp-doc-markup__handle').count()
const hb = await page.locator('.erp-doc-markup__handle').first().boundingBox()
await drag(center(hb), { x: center(hb).x - mark.width * 0.5, y: center(hb).y })
await page.waitForTimeout(200)
await shot('edit-narrow')
// Esc lần đầu chỉ bỏ chọn dấu, hai lần sau mới thoát chế độ đánh dấu rồi đóng ô xem to.
await page.keyboard.press('Escape')
await close()
console.log(JSON.stringify(out))
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)
{
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
  const exported = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(pdfPath)), useSystemFonts: false, verbosity: 0 }).promise
  const first = await exported.getPage(1)
  await first.getOperatorList()
  const items = (await first.getTextContent()).items
  const item = items.find((entry) => entry.str.includes('XL-04'))
  out.exportFont = item ? first.commonObjs.get(item.fontName)?.name : null
  // Viết lại thật: chữ cũ không còn trong tệp, dòng bên dưới bị đẩy xuống đúng số hàng chữ mới chiếm thêm.
  out.oldTextLeft = items.some((entry) => entry.str.includes('XL-03'))
  const original = await (await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(FIX + 'hop-dong.pdf')), verbosity: 0 }).promise).getPage(1)
  const lineY = (list) => list.find((entry) => entry.str.includes('Tiếng Việt'))?.transform[5]
  out.pushedDown = Math.round((lineY((await original.getTextContent()).items) - lineY(items)) * 10) / 10
  out.editedLines = new Set(items.filter((entry) => /XL-04|giai đoạn|phía đông/.test(entry.str)).map((entry) => Math.round(entry.transform[5]))).size
  for (const [n, text, gone] of [
    [13, 'ĐÃ SỬA dòng xoay 90', 'top of unrotated'],
    [14, 'ĐÃ SỬA vùng cắt', 'CROPBOX 50,60'],
  ]) {
    const all = (await (await exported.getPage(n)).getTextContent()).items.map((entry) => entry.str).join(' ')
    out[`p${n}`] = { written: all.includes(text), oldGone: !all.includes(gone) }
  }
}
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
await page.getByRole('button', { name: 'Gỡ hết' }).first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles(pdfPath)
await page.locator('.erp-doc-page').nth(14).waitFor()
for (const n of [1, 4, 13, 14]) {
  await page.getByRole('button', { name: `Xem to trang ${n}`, exact: true }).click()
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1200)
  await shot(`export-p${n}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}
// Chỉ che bề mặt: chữ gốc vẫn tìm ra trong tệp đã xuất.
await page.keyboard.press('Control+f')
await page.getByRole('searchbox', { name: 'Tìm trong tài liệu' }).fill('XL-03')
await page.waitForTimeout(1500)
out.stillSearchable = await page.locator('.erp-doc-search__status').innerText()
out.errors = errors
console.log(JSON.stringify(out))
await browser.close()
