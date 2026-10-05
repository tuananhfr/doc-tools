// Sửa chữ tràn trang trên trang có form: ô form đi theo nhãn của nó sang trang mới, bảng "Điền form" vẫn hiện mỗi
// trường một lần, giá trị điền trước lẫn sau lần sửa đều còn, tệp xuất không có trường nào bị nhân đôi (`_2`).
// Ô form cũng được tính khi xét trang đầy: ô cao bị đẩy quá lề dưới thì sang trang mới dù chữ quanh nó vẫn vừa.
// Nhóm radio không bị xẻ ra hai trang: cả nhóm đi cùng nhau, lựa chọn đã đánh dấu còn nguyên.
import fs from 'node:fs'
import { inspect } from './lib/inspect-pdf.mjs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const OUT = outDir('form-spill')
const TAG = process.env.TAG ?? 'run'
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, acceptDownloads: true, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
const checks = {}

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'ho-so-form.pdf'])
await page.locator('.erp-doc-page').nth(1).waitFor()
await page.waitForTimeout(1200)
const shot = (name) => page.screenshot({ path: `${OUT}${TAG}-${theme}-${vw}-${name}.png` })
const tap = (x, y) => (mobile ? page.touchscreen.tap(x, y) : page.mouse.click(x, y))
const gridPages = () => page.locator('.erp-doc-page').count()
const formTab = page.getByRole('tab', { name: /Điền form/ })
const openForm = async () => {
  await formTab.scrollIntoViewIfNeeded()
  await formTab.click()
  await page.getByLabel('don_vi').waitFor()
}

// 1. Điền trước khi sửa chữ: một trường sẽ ở lại trang gốc, một trường sẽ sang trang mới.
await openForm()
const unit = 'Công ty TNHH Xây dựng Hoà Bình'
const note = 'Thanh toán đợt 2\nKèm biên bản nghiệm thu khối lượng'
await page.getByLabel('don_vi').fill(unit)
await page.getByLabel('ghi_chu').fill(note)
await page.getByRole('button', { name: /Áp dụng/ }).click()
await page.getByText(/Đã điền 2 trường/).waitFor({ timeout: 15000 })
await page.waitForTimeout(800)

/** Thay tiêu đề trang 1 bằng `count` dòng rồi đóng ô xem to. */
const retitle = async (count, name, query = 'trang 1/2') => {
  await page.keyboard.press('Control+f')
  const search = page.getByRole('searchbox', { name: 'Tìm trong tài liệu' })
  // Trang 2 cũng có tiêu đề này: tìm đúng phần chỉ trang 1 có, không thì lần sửa thứ hai nhảy sang kết quả kế tiếp.
  await search.fill(query)
  await page.waitForFunction(() => document.querySelector('.erp-doc-search__hit'), null, { timeout: 30000 })
  await search.press('Enter')
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1000)
  await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
  await page.locator('.erp-doc-markup').waitFor()
  const editTool = page.getByRole('button', { name: 'Sửa chữ', exact: true })
  await editTool.scrollIntoViewIfNeeded()
  await editTool.click()
  await page.waitForTimeout(2500)
  const hit = await page.locator('.erp-doc-hits polygon.is-active').boundingBox()
  await tap(hit.x + hit.width / 2, hit.y + hit.height / 2)
  const field = page.getByRole('textbox', { name: 'Chữ thay thế' })
  await field.waitFor({ timeout: 20000 })
  await field.fill(Array.from({ length: count }, (_, index) => `Dòng ${index + 1}`).join('\n'))
  await page.keyboard.press('Control+Enter')
  await page.waitForFunction(() => !document.querySelector('.erp-doc-markup[aria-busy]'), null, { timeout: 60000 })
  await page.waitForTimeout(1500)
  await shot(name)
  for (let step = 0; step < 3; step++) await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
}
const exportPdf = async (name) => {
  await page.getByRole('tab', { name: 'Xuất tệp' }).click()
  const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: /Tải PDF/ }).first().click()])
  const path = `${OUT}${TAG}-${theme}-${vw}-${name}.pdf`
  await download.saveAs(path)
  return inspect(fs.readFileSync(path))
}
const widgets = (report) => report.pages.map((list) => list.filter((item) => item.subtype === '/Widget'))
const undo = async (times) => {
  await page.locator('body').click({ position: { x: 5, y: 5 } })
  for (let step = 0; step < times; step++) {
    await page.keyboard.press('Control+z')
    await page.waitForTimeout(900)
  }
}

// 2. Tiêu đề thành 22 dòng: mọi dòng chữ vẫn vừa trang, chỉ ô ghi chú (cao 65 pt, nằm dưới nhãn) bị đẩy quá lề dưới
// → riêng ô ấy sang trang mới, không ô nào nằm ngoài trang.
await retitle(22, 'tall-field')
const tall = widgets(await exportPdf('tall-field'))
checks.tallField = {
  pagesAdded: (await gridPages()) - 2,
  widgetPages: tall.map((list) => list.map((item) => item.field)),
  allInside: tall.flat().every((item) => item.inside),
}
await undo(1)

// 3. Tiêu đề thành 30 dòng: nửa dưới của form bị đẩy quá lề dưới.
await retitle(30, 'edited')
checks.pagesAdded = (await gridPages()) - 2

// 4. Bảng form sau khi tràn: mỗi trường đúng một ô nhập, giá trị đã điền còn nguyên.
await openForm()
const names = ['don_vi', 'so_hop_dong', 'da_ky_nhay', 'dot_thanh_toan', 'ghi_chu', 'tien_mat', 'chuyen_khoan']
checks.inputsPerField = Object.fromEntries(await Promise.all(names.map(async (name) => [name, await page.getByLabel(name, { exact: true }).count()])))
checks.keptValues = (await page.getByLabel('don_vi').inputValue()) === unit && (await page.getByLabel('ghi_chu').inputValue()) === note
await page.locator('.erp-doc-export').scrollIntoViewIfNeeded()
await shot('panel')

// 5. Điền tiếp ở cả hai trang của cụm.
await page.getByLabel('so_hop_dong').fill('45/2026/HĐ-TC')
await page.getByLabel('dot_thanh_toan').selectOption('Đợt 3')
await page.getByLabel('tien_mat').check()
await page.getByRole('button', { name: /Áp dụng/ }).click()
await page.getByText(/Đã điền 3 trường/).waitFor({ timeout: 15000 })
await page.waitForTimeout(1200)
checks.pagesAfterFill = (await gridPages()) - 2

await page.getByRole('button', { name: 'Xem to trang 2' }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1500)
await shot('spill-page')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

const report = await exportPdf('export')
// Mỗi trường một lần, không có `_2`; ô nào nằm trang nào, có ô nào ra ngoài trang không.
checks.exported = report.fields
checks.widgetPages = widgets(report).map((list) => list.map((item) => item.field))
checks.allInside = widgets(report).flat().every((item) => item.inside)

// 6. Hoàn tác lần điền thứ hai rồi lần sửa chữ: về hai trang, form còn giá trị của lần điền đầu.
await undo(2)
await openForm()
checks.afterUndo = { pagesAdded: (await gridPages()) - 2, inputs: await page.getByLabel('don_vi', { exact: true }).count(), unit: await page.getByLabel('don_vi').inputValue() }

// 7. Nhóm radio xếp dọc ở cuối trang, tiêu đề thành 5 dòng: lề dưới rơi vào giữa nút thứ hai và thứ ba. Xẻ nhóm ra hai
// tệp là thành hai trường (`_2`) và lựa chọn đang đánh dấu chỉ sang nút khác — nên cả nhóm phải sang trang mới.
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'phieu-radio.pdf'])
await page.locator('.erp-doc-page').first().waitFor()
await page.waitForTimeout(1200)
await retitle(5, 'radio', 'trang 1/1')
const radio = await exportPdf('radio')
checks.radio = {
  pagesAdded: (await gridPages()) - 1,
  fields: radio.fields.filter((item) => item.kind === 'PDFRadioGroup').map((item) => `${item.name}=${item.value}`),
  widgetPages: widgets(radio).map((list) => list.map((item) => item.field)),
  allInside: widgets(radio).flat().every((item) => item.inside),
}

console.log(JSON.stringify({ theme, vw, checks, expectUnit: unit, errors }, null, 1))
await browser.close()
