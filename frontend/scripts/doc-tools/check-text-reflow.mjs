// Sửa chữ = viết lại trang: ký hiệu đầu dòng đứng yên, chữ xuống hàng ở mép cột / mép ô bảng,
// phần bên dưới (kể cả dấu tay) bị đẩy xuống, viền bảng dài theo hàng, vùng cắt của ô đi theo chữ,
// trang hai cột chỉ đẩy cột đang sửa và chân trang đứng yên, phần tràn sang trang mới (hoàn tác gỡ cả trang ấy),
// trang scan thì chỉ che bề mặt.
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const OUT = outDir('text-reflow')
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
await page.locator('input[type=file]').first().setInputFiles(['danh-sach', 'bang-ke', 'ho-so-scan', 'bang-vien', 'bang-cat', 'hai-cot', 'day-trang'].map((name) => `${FIX}${name}.pdf`))
await page.locator('.erp-doc-page').nth(2).waitFor()
await page.waitForTimeout(1000)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }
const center = (b) => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
const field = page.getByRole('textbox', { name: 'Chữ thay thế' })
const notices = () => page.locator('.erp-doc-markbar__notice').allInnerTexts()

async function tool(name) {
  const button = page.getByRole('button', { name, exact: true })
  await button.scrollIntoViewIfNeeded()
  await button.click()
}

/** Mở ô xem to ở trang có `query`, cầm công cụ Sửa chữ; trả khung chữ tìm thấy trên màn hình. */
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
  await tool('Sửa chữ')
  // Lần đầu phải tải PDFium (~4,6 MB) rồi mới biết trang viết lại được không.
  await page.waitForTimeout(2500)
  return page.locator('.erp-doc-hits polygon.is-active').boundingBox()
}

async function tap(p) {
  if (mobile) await page.touchscreen.tap(p.x, p.y)
  else await page.mouse.click(p.x, p.y)
  await page.waitForTimeout(150)
}

async function drag(a, b, steps = 10) {
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(a.x + ((b.x - a.x) * i) / steps, a.y + ((b.y - a.y) * i) / steps)
  await page.mouse.up()
  await page.waitForTimeout(150)
}

/** Lưu ô gõ rồi chờ trang được viết lại xong (PDFium + vẽ lại trang). */
async function commit() {
  await page.keyboard.press('Control+Enter')
  await page.waitForFunction(() => !document.querySelector('.erp-doc-markup[aria-busy]'), null, { timeout: 30000 })
  await page.waitForTimeout(1200)
}

async function close() {
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
}

/**
 * Mực thật trên canvas trang trong khung màn hình `box`: `fill` = tỉ lệ điểm ảnh tối, `rows` = tỉ lệ hàng điểm ảnh
 * có ít nhất một điểm tối (nét kẻ dọc liền mạch thì bằng 1). Lớp chữ không dùng được cho việc này — chữ bị vùng
 * cắt nuốt mất vẫn còn nguyên trong lớp chữ.
 */
const ink = (box) =>
  page.evaluate((b) => {
    const canvas = document.querySelector('.erp-doc-preview__canvas canvas')
    const frame = canvas.getBoundingClientRect()
    const k = canvas.width / frame.width
    const [x, y] = [Math.round((b.x - frame.left) * k), Math.round((b.y - frame.top) * k)]
    const [w, h] = [Math.max(1, Math.round(b.width * k)), Math.max(1, Math.round(b.height * k))]
    const { data } = canvas.getContext('2d').getImageData(x, y, w, h)
    let dark = 0
    let rows = 0
    for (let row = 0; row < h; row++) {
      let any = false
      for (let col = 0; col < w; col++) {
        const at = (row * w + col) * 4
        // Nét kẻ 0,75 pt ở mức thu nhỏ chỉ còn nửa điểm ảnh, khử răng cưa thành xám nhạt; nền ô nhạt nhất vẫn sáng hơn ngưỡng này.
        if (data[at] + data[at + 1] + data[at + 2] < 600) {
          dark++
          any = true
        }
      }
      if (any) rows++
    }
    return { fill: Math.round((dark / (w * h)) * 1000) / 1000, rows: Math.round((rows / h) * 100) / 100 }
  }, box)

const pxPerPt = async () => (await page.locator('.erp-doc-preview__sheet').boundingBox()).width / 595.28
const typedLines = () => field.evaluate((el) => Math.round(el.scrollHeight / parseFloat(getComputedStyle(el).lineHeight)))

// 1. Dòng có chấm đầu dòng: ô gõ chỉ mang chữ, không mang ký hiệu; gõ dài thì xuống hàng.
const bullet = await openAt('Biên bản lập tại')
out.notice = await notices()
await tap(center(bullet))
await field.waitFor({ timeout: 20000 })
out.bullet = await field.inputValue()
await field.fill(`${out.bullet} Trường hợp vắng một bên thì lập biên bản ghi nhận và gửi bản chụp trong ngày để bên vắng mặt ký bổ sung.`)
await page.waitForTimeout(200)
out.bulletLines = await typedLines()
await shot('bullet-typing')
await commit()
out.bulletShapes = await page.locator('.erp-doc-markup > g > *').count()
await shot('bullet-done')
await close()

// 2. Dòng đánh số: Chrome ghi "1. " liền vào chữ (Word thì tách bằng tab và số đứng ngoài) — sửa vẫn phải viết lại được.
const ordinal = await openAt('Kiểm tra hồ sơ')
await tap(center(ordinal))
await field.waitFor({ timeout: 20000 })
out.ordinal = await field.inputValue()
await page.keyboard.press('Escape')
await close()

// 3. Kéo qua cả đoạn thụt đầu dòng: lấy trọn các dòng, giữ thụt lề, thêm chữ thì cả đoạn dàn lại.
if (!mobile) {
  const para = await openAt('Trường hợp phát hiện')
  const scale = await pxPerPt()
  await drag({ x: para.x + 2, y: center(para).y }, { x: para.x + 30, y: center(para).y + 11 * 1.35 * scale * 2 })
  await field.waitFor({ timeout: 20000 })
  out.paragraph = await field.inputValue()
  out.paragraphIndent = await field.evaluate((el) => parseFloat(getComputedStyle(el).textIndent) > 0)
  out.paragraphLines = await typedLines()
  await field.fill(`${out.paragraph} Quá thời hạn mà chưa khắc phục thì tạm dừng thi công hạng mục liên quan cho tới khi có biên bản nghiệm thu lại.`)
  await page.waitForTimeout(200)
  out.paragraphGrown = await typedLines()
  await shot('paragraph-typing')
  await commit()
  await shot('paragraph-done')
  await close()
}

// 3b. Bấm (không kéo) vào dòng giữa đoạn: lấy trọn đoạn văn như Word, không lấn sang đoạn kế bên.
const middle = await openAt('đề xuất biện pháp')
await tap(center(middle))
await field.waitFor({ timeout: 20000 })
const clickedText = await field.inputValue()
out.paragraphClick = {
  fromFirstLine: clickedText.startsWith('Trường hợp phát hiện'),
  lines: await typedLines(),
  nextParagraphLeftAlone: !clickedText.includes('Khối lượng nghiệm thu'),
}
await page.keyboard.press('Escape')
await close()

// 4. Ô bảng: chữ dài xuống hàng trước ô bên cạnh; khung vẽ tay phía dưới bị đẩy theo.
const cell = await openAt('Xi măng PCB40')
const sheet = await page.locator('.erp-doc-markup').boundingBox()
if (!mobile) {
  await tool('Khung chữ nhật')
  await drag({ x: sheet.x + sheet.width * 0.3, y: sheet.y + sheet.height * 0.5 }, { x: sheet.x + sheet.width * 0.5, y: sheet.y + sheet.height * 0.56 })
  await tool('Sửa chữ')
}
const shape = page.locator('.erp-doc-markup > g > *').first()
const before = mobile ? null : await shape.boundingBox()
await tap(center(cell))
await field.waitFor({ timeout: 20000 })
out.cell = await field.inputValue()
await field.fill('Xi măng PCB40 bao 50 kg, nhập theo lô, kèm chứng chỉ xuất xưởng')
await page.waitForTimeout(200)
out.cellLines = await typedLines()
await shot('cell-typing')
await commit()
if (before) out.shapeMovedPt = Math.round((((await shape.boundingBox()).y - before.y) / (await pxPerPt())) * 10) / 10
await shot('cell-done')

// 5. Chữ mới dài hơn cả trang: phần thừa sang trang mới và có báo; hoàn tác gỡ luôn trang ấy.
const gridPages = () => page.locator('.erp-doc-page').count()
const pagesAtStart = await gridPages()
await tap(center(cell))
await field.waitFor({ timeout: 20000 })
await field.fill(Array.from({ length: 70 }, (_, index) => `Dòng ${index + 1}`).join('\n'))
await commit()
out.overflow = { toast: (await page.getByText(/Phần tràn đã sang/).count()) > 0, pagesAdded: (await gridPages()) - pagesAtStart }
await shot('overflow')
await page.locator('.erp-doc-markbar').getByRole('button', { name: 'Hoàn tác', exact: true }).click()
await page.waitForTimeout(1200)
out.overflow.pagesAfterUndo = (await gridPages()) - pagesAtStart
await close()

// 6. Trang scan không có chữ thật: vẫn là che bề mặt, và phải nói ra.
await page.getByRole('button', { name: 'Xem to trang 3', exact: true }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await page.locator('.erp-doc-markup').waitFor()
await tool('Sửa chữ')
await page.waitForTimeout(2500)
out.scanNotice = await notices()
await shot('scan')
await close()

// 7. Bảng kẻ viền đủ bốn phía: hàng cao thêm thì viền dọc của hàng ấy phải dài theo, không hở.
const grid = await openAt('Dầm ngang nhịp 4')
await tap(center(grid))
await field.waitFor({ timeout: 20000 })
await field.fill(`${await field.inputValue()} đoạn giữa hai trụ T3 và T4, đổ bê tông một lần`)
await commit()
await shot('grid-done')
await close()
const gridRow = await openAt('M-02')
const gridScale = await pxPerPt()
const gridSheet = await page.locator('.erp-doc-preview__sheet').boundingBox()
// Viền trái của bảng nằm đúng lề trang 20 mm; dải hẹp quanh nó, cao đúng hai dòng chữ của hàng vừa cao thêm.
out.grid = { border: await ink({ x: gridSheet.x + (56.69 - 2.5) * gridScale, y: gridRow.y, width: 4.5 * gridScale, height: 28 * gridScale }) }
await close()

// 8. Bảng kiểu Word, mỗi ô một vùng cắt: hàng dưới bị đẩy xuống vẫn phải nhìn thấy chữ.
const clipped = await openAt('Mong tru T3')
await tap(center(clipped))
await field.waitFor({ timeout: 20000 })
await field.fill('Mong tru T3 phia thuong luu, do be tong mac 350 theo ban ve da duyet dot hai')
await commit()
await shot('clip-done')
await close()
out.clip = { rowBelow: await ink(await openAt('Lan can cau')) }
await close()
out.clip.lineBelow = await ink(await openAt('Dong duoi bang'))
await close()

// 9. Trang hai cột có chân trang: chỉ cột đang sửa bị đẩy, chữ mới ngắt ở mép cột của nó.
const columnHit = await openAt('2. Mọi sai lệch')
await tap(center(columnHit))
await field.waitFor({ timeout: 20000 })
await field.fill(`${await field.inputValue()} Biên bản phải có chữ ký của chỉ huy trưởng và tư vấn giám sát trước khi thi công tiếp.`)
await commit()
await shot('columns-done')
await close()

// 10. Trang đã đầy, có chân trang: đoạn bị đẩy quá lề dưới sang một trang mới, chân trang ở lại trang cũ.
const fullHit = await openAt('17. Nhà thầu')
await tap(center(fullHit))
await field.waitFor({ timeout: 20000 })
const more = Array.from({ length: 5 }, (_, index) => `Câu bổ sung số ${index + 1} nói rõ thêm về hồ sơ chất lượng, biên bản lấy mẫu và trách nhiệm lưu giữ của từng bên tham gia.`).join(' ')
await field.fill(`${await field.inputValue()} ${more}`)
await commit()
await shot('spill-done')
await close()
out.spill = { pagesAdded: (await gridPages()) - pagesAtStart }

// Soi tệp xuất: chữ cũ không còn, ký hiệu đầu dòng còn nguyên chỗ, phần dưới dời đúng.
await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const itemsOf = async (file, n) => {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: false, verbosity: 0 }).promise
  // `n` <= 0 đếm lùi từ trang cuối: bản scan đứng giữa có nhiều trang nên các trang sau không có số cố định.
  const items = (await (await doc.getPage(n > 0 ? n : doc.numPages + n)).getTextContent()).items.filter((item) => item.str.trim())
  return items.map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5], right: item.transform[4] + item.width }))
}
const find = (items, text) => items.find((item) => item.str.includes(text))
const round = (value) => Math.round(value * 10) / 10

const listWas = await itemsOf(FIX + 'danh-sach.pdf', 1)
const listNow = await itemsOf(pdfPath, 1)
out.list = {
  // Dòng sửa vẫn bắt đầu đúng chỗ cũ; dòng xuống hàng thẳng mép với nó (thụt treo của danh sách).
  startMoved: round(find(listNow, 'Biên bản lập tại').x - find(listWas, 'Biên bản lập tại').x),
  wrappedAt: round(find(listNow, 'ký bổ sung').x - find(listWas, 'Biên bản lập tại').x),
  nextBulletDown: round(find(listWas, 'Ảnh chụp kèm').y - find(listNow, 'Ảnh chụp kèm').y),
  oneCopy: listNow.filter((item) => item.str.includes('Biên bản lập tại')).length,
}
if (!mobile) {
  out.list.indentKept = round(find(listNow, 'Trường hợp phát hiện').x - find(listWas, 'Trường hợp phát hiện').x)
  out.list.lastLineAtMargin = round(find(listNow, 'nghiệm thu lại').x - find(listWas, 'Khối lượng nghiệm thu').x + 10 * 2.8346)
}

const tableWas = await itemsOf(FIX + 'bang-ke.pdf', 1)
const tableNow = await itemsOf(pdfPath, 2)
const nextCell = find(tableNow, 'tấn')
const cellTop = find(tableNow, 'Xi măng')
const cellLines = tableNow.filter((item) => item.x >= cellTop.x - 1 && item.x < nextCell.x && item.y <= cellTop.y + 1 && item.y > find(tableNow, '0457').y + 1)
const cellRows = [...new Set(cellLines.map((item) => Math.round(item.y)))]
out.table = {
  cellLines: cellRows.length,
  // Trong ô, dòng cách dòng theo cỡ chữ (11 pt) chứ không theo chiều cao hàng của bảng.
  cellPitch: round((Math.max(...cellRows) - Math.min(...cellRows)) / Math.max(1, cellRows.length - 1)),
  // Chữ trong ô không được chạm ô "tấn" bên cạnh; ô cùng hàng đứng yên, hàng dưới bị đẩy xuống.
  clearOfNextCell: round(find(tableNow, 'tấn').x - Math.max(...cellLines.map((item) => item.right))),
  sameRowMoved: round(find(tableWas, 'tấn').y - find(tableNow, 'tấn').y),
  nextRowDown: round(find(tableWas, '0457').y - find(tableNow, '0457').y),
}

const columnsWas = await itemsOf(FIX + 'hai-cot.pdf', 1)
// Ba trang cuối của tệp xuất: trang hai cột, trang đầy chữ, trang mới chứa phần tràn của nó.
const columnsNow = await itemsOf(pdfPath, -2)
const down = (text) => round(find(columnsWas, text).y - find(columnsNow, text).y)
const otherColumn = find(columnsNow, '10. Mọi sai lệch')
const edited = columnsNow.filter((item) => item.x < otherColumn.x - 5 && item.y <= find(columnsNow, '2. Mọi sai lệch').y + 1 && item.y > find(columnsNow, '3. Vật liệu').y + 1)
out.columns = {
  editedLines: new Set(edited.map((item) => Math.round(item.y))).size,
  // Chữ mới không được lấn qua khe cột; đoạn dưới cùng cột bị đẩy, cột bên kia và chân trang đứng yên.
  clearOfOtherColumn: round(otherColumn.x - Math.max(...edited.map((item) => item.right))),
  sameColumnDown: down('3. Vật liệu'),
  lastOfColumnDown: down('8. Nhật ký'),
  otherColumnMoved: Math.max(...['9. Nhà thầu', '10. Mọi sai lệch', '11. Vật liệu', '16. Nhật ký'].map((text) => Math.abs(down(text)))),
  footerMoved: down('Ban quản lý dự án'),
}

const fullWas = await itemsOf(FIX + 'day-trang.pdf', 1)
const fullNow = await itemsOf(pdfPath, -1)
const spilled = await itemsOf(pdfPath, 0)
const has = (items, text) => items.some((item) => item.str.includes(text))
Object.assign(out.spill, {
  // Trang cũ giữ chân trang, mất đoạn cuối; trang mới bắt đầu từ lề trên (ngang tiêu đề của trang cũ), không có chân trang.
  footerStays: has(fullNow, 'Ban quản lý dự án') && !has(spilled, 'Ban quản lý dự án'),
  lastParagraphMoved: !has(fullNow, '19. Vật liệu') && has(spilled, '19. Vật liệu'),
  editedStays: has(fullNow, 'Câu bổ sung số 1'),
  topGap: round(Math.max(...fullWas.map((item) => item.y)) - Math.max(...spilled.map((item) => item.y))),
  clearOfFooter: round(Math.min(...fullNow.filter((item) => !item.str.includes('Ban quản lý')).map((item) => item.y)) - find(fullNow, 'Ban quản lý dự án').y),
})
out.errors = errors
console.log(JSON.stringify(out))
await browser.close()
