// Sửa chữ ở vùng hai cột THẤP (dưới 40% trang) và ở bảng không viền có ô nhiều dòng — hai thứ trông giống nhau mà phải
// xử lý ngược nhau: hai cột thì chỉ cột đang sửa bị đẩy, bảng thì cả hàng bên dưới đi cùng nhau. Kèm theo: bấm vào một
// dòng của cột lấy trọn đoạn dù dưới vùng hai cột có đoạn trải cả trang.
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const OUT = outDir('column-zones')
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
await page.locator('input[type=file]').first().setInputFiles(['hai-cot-ngan', 'bang-khong-vien'].map((name) => `${FIX}${name}.pdf`))
await page.locator('.erp-doc-page').nth(1).waitFor()
await page.waitForTimeout(1000)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }
const field = page.getByRole('textbox', { name: 'Chữ thay thế' })
const MORE = ' Biên bản phải có chữ ký của chỉ huy trưởng và tư vấn giám sát trước khi thi công tiếp.'

/** Tìm `query`, cầm công cụ Sửa chữ, bấm vào chữ tìm thấy; trả về chữ ô gõ nhận được. */
async function edit(query) {
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
  const tool = page.getByRole('button', { name: 'Sửa chữ', exact: true })
  await tool.scrollIntoViewIfNeeded()
  await tool.click()
  // Lần đầu phải tải PDFium rồi mới biết trang viết lại được không.
  await page.waitForTimeout(2500)
  const hit = await page.locator('.erp-doc-hits polygon.is-active').boundingBox()
  const at = { x: hit.x + hit.width / 2, y: hit.y + hit.height / 2 }
  if (mobile) await page.touchscreen.tap(at.x, at.y)
  else await page.mouse.click(at.x, at.y)
  await field.waitFor({ timeout: 20000 })
  return field.inputValue()
}

async function commit(name) {
  await field.fill(`${await field.inputValue()}${MORE}`)
  await page.keyboard.press('Control+Enter')
  await page.waitForFunction(() => !document.querySelector('.erp-doc-markup[aria-busy]'), null, { timeout: 30000 })
  await page.waitForTimeout(1200)
  await shot(name)
  for (let step = 0; step < 3; step++) await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}

// 1. Vùng hai cột thấp: bấm dòng đầu của đoạn 2 ở cột trái — ô gõ nhận cả đoạn, không lấn sang đoạn 3.
const paragraph = await edit('2. Mọi sai lệch')
out.click = { whole: paragraph.startsWith('2. Mọi sai lệch') && paragraph.trimEnd().endsWith('cụ thể.'), nextLeftAlone: !paragraph.includes('3. Vật liệu') }
await commit('columns')

// 2. Bảng không viền: sửa ô trái của hàng 2.
const cell = await edit('Tổ 2:')
out.cell = { whole: cell.startsWith('Tổ 2:') && cell.trimEnd().endsWith('cụ thể.') }
await commit('table')

await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')
const itemsOf = async (file, n) => {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: false, verbosity: 0 }).promise
  const items = (await (await doc.getPage(n)).getTextContent()).items.filter((item) => item.str.trim())
  return { pages: doc.numPages, items: items.map((item) => ({ str: item.str, x: item.transform[4], y: item.transform[5], right: item.transform[4] + item.width })) }
}
const round = (value) => Math.round(value * 10) / 10
const moved = (was, now) => (text) => round(was.items.find((item) => item.str.includes(text)).y - now.items.find((item) => item.str.includes(text)).y)

const columnsNow = await itemsOf(pdfPath, 1)
const down = moved(await itemsOf(`${FIX}hai-cot-ngan.pdf`, 1), columnsNow)
const other = columnsNow.items.find((item) => item.str.includes('6. Nhà thầu'))
const top = columnsNow.items.find((item) => item.str.includes('2. Mọi sai lệch')).y
const edited = columnsNow.items.filter((item) => item.x < other.x - 5 && item.y <= top + 1 && item.y > columnsNow.items.find((item) => item.str.includes('3. Vật liệu')).y + 1)
out.pages = columnsNow.pages
out.columns = {
  // Chữ mới ngắt trong cột của nó; đoạn dưới cùng cột và đoạn trải cả trang bị đẩy, cột bên kia và chân trang đứng yên.
  clearOfOtherColumn: round(other.x - Math.max(...edited.map((item) => item.right))),
  sameColumnDown: down('3. Vật liệu'),
  closingDown: down('Hai bên cam kết'),
  otherColumnMoved: Math.max(...['5. Vật liệu', '6. Nhà thầu', '7. Mọi sai lệch'].map((text) => Math.abs(down(text)))),
  footerMoved: down('Ban quản lý dự án'),
}

const rowDown = moved(await itemsOf(`${FIX}bang-khong-vien.pdf`, 1), await itemsOf(pdfPath, 2))
out.table = {
  // Ô cùng hàng đứng yên; hai ô của hàng dưới dời bằng nhau — coi bảng là hai cột thì ô phải ở lại, hàng lệch.
  sameRowMoved: rowDown('Việc 2:'),
  nextRowLeftDown: rowDown('Tổ 3:'),
  nextRowRightDown: rowDown('Việc 3:'),
  lastRowDown: [rowDown('Tổ 4:'), rowDown('Việc 4:')],
}
out.errors = errors
console.log(JSON.stringify(out))
await browser.close()
