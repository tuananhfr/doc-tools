import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const { PDFDocument, PDFName, PDFRawStream, PDFArray, PDFDict } = createRequire(import.meta.url)('pdf-lib')

const OUT = outDir('compress-annot')
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

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'ho-so-scan.pdf', FIX + 'hop-dong.pdf', FIX + 'xoay-crop.pdf', FIX + 'anh-hien-truong.jpg'])
await page.locator('.erp-doc-page').nth(18).waitFor({ timeout: 60000 })
await page.waitForTimeout(1500)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }

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
  await page.waitForTimeout(120)
}
async function clickAt(tool, p) {
  if (tool) await page.getByRole('button', { name: tool, exact: true }).click()
  const box = await page.locator('.erp-doc-markup').boundingBox()
  await page.mouse.click(box.x + p[0] * box.width, box.y + p[1] * box.height)
  await page.waitForTimeout(120)
}
async function openMarking(n) {
  await page.locator('.erp-doc-page').nth(n - 1).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: `Xem to trang ${n}`, exact: true }).click()
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
  await page.locator('.erp-doc-markup').waitFor()
  await page.waitForTimeout(400)
}
async function close() {
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}

// Trang 4 (hop-dong tr 1): đủ loại dấu + một vùng che chữ (phải in phẳng).
await openMarking(4)
await drag('Khung chữ nhật', [0.1, 0.1], [0.45, 0.2])
await drag('Mũi tên', [0.55, 0.12], [0.85, 0.25])
await drag('Khung tròn', [0.1, 0.62], [0.35, 0.7])
await drag('Đám mây (vùng sửa)', [0.55, 0.62], [0.9, 0.72])
await drag('Tô sáng', [0.2, 0.3], [0.8, 0.32])
await drag('Bút', [0.1, 0.75], [0.3, 0.82], 12)
await clickAt('Chữ', [0.55, 0.78])
await page.keyboard.type('Sửa lại kích thước')
await clickAt(null, [0.02, 0.98])
await clickAt('Ghi chú', [0.85, 0.85])
await page.keyboard.type('Thiếu chữ ký bên B')
await page.keyboard.press('Control+Enter')
await clickAt('Dấu duyệt', [0.3, 0.9])
await drag('Che chữ', [0.05, 0.4], [0.5, 0.45])
out.marks4 = await page.locator('.erp-doc-markup > g > *').count()
await shot('marked-4')
await close()

// Trang 16 (xoay-crop tr 1, /Rotate 90 ở nguồn).
await openMarking(16)
await drag('Khung chữ nhật', [0.1, 0.1], [0.4, 0.3])
await drag('Mũi tên', [0.5, 0.5], [0.8, 0.8])
await clickAt('Ghi chú', [0.7, 0.2])
await page.keyboard.type('Góc xoay')
await page.keyboard.press('Control+Enter')
await shot('marked-16')
await close()

await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const panel = page.locator('.erp-doc-export__options')
await panel.scrollIntoViewIfNeeded()
await shot('panel-default')
out.hasMarkupSelect = await page.getByLabel('Dấu tay').count()

async function download(click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), click()])
  const path = OUT + `${theme}-${vw}-${Date.now()}-${dl.suggestedFilename()}`
  await dl.saveAs(path)
  return path
}
const pdfButton = page.getByRole('button', { name: /^Tải PDF/ })

// Mốc: không nén, in phẳng.
const basePath = await download(() => pdfButton.click())
out.baseBytes = fs.statSync(basePath).size
await page.waitForTimeout(500)
out.baseToasts = await page.getByText(/Đã nén|Không nén thêm/).count()

await page.getByLabel('Nén ảnh').selectOption('strong')
await page.getByLabel('Dấu tay').selectOption('annotations')
await panel.scrollIntoViewIfNeeded()
await shot('panel-options')
const toastLoc = page.getByText(/Đã nén \d+ ảnh/)
const before = await toastLoc.count()
const packedPath = await download(() => pdfButton.click())
for (let i = 0; i < 100 && (await toastLoc.count()) <= before; i++) await page.waitForTimeout(100)
out.toast = await toastLoc.last().innerText()
out.packedBytes = fs.statSync(packedPath).size
await shot('toast')

// Kiểm tệp bằng pdf-lib.
const doc = await PDFDocument.load(fs.readFileSync(packedPath))
out.pageCount = doc.getPageCount()
const annotsOf = (i) => {
  const a = doc.getPage(i).node.lookup(PDFName.of('Annots'))
  if (!(a instanceof PDFArray)) return []
  return a.asArray().map((ref) => {
    const d = doc.context.lookup(ref)
    const ap = d.lookup(PDFName.of('AP'))
    return {
      sub: d.get(PDFName.of('Subtype')).decodeText(),
      ap: ap instanceof PDFDict && !!ap.get(PDFName.of('N')),
      rect: d.lookup(PDFName.of('Rect')).asArray().map((n) => Math.round(n.asNumber())),
    }
  })
}
out.annots4 = annotsOf(3).map((a) => a.sub + (a.ap ? '' : '!noAP')).join(',')
out.annots16 = annotsOf(15)
out.annotsOther = [0, 1, 2, 4, 18].map((i) => annotsOf(i).length).join(',')
let dct = 0
let dctBytes = 0
for (const [, obj] of doc.context.enumerateIndirectObjects()) {
  if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype'))?.decodeText?.() === 'Image') {
    const f = obj.dict.get(PDFName.of('Filter'))
    if (f?.decodeText?.() === 'DCTDecode') {
      dct++
      dctBytes += obj.contents.length
    }
  }
}
out.dct = dct
out.dctBytes = dctBytes

// Nạp lại tệp xuất: dấu phải hiện từ appearance stream.
page.on('dialog', (d) => d.accept())
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 10000 })
await page.locator('input[type=file]').first().setInputFiles([packedPath])
await page.locator('.erp-doc-page').nth(18).waitFor({ timeout: 60000 })
for (const n of [4, 16]) {
  await page.locator('.erp-doc-page').nth(n - 1).scrollIntoViewIfNeeded()
  await page.getByRole('button', { name: `Xem to trang ${n}`, exact: true }).click()
  await page.locator('.erp-doc-preview__canvas canvas').waitFor()
  await page.waitForTimeout(1500)
  await shot(`reimport-${n}`)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}

if (full) {
  // Tách có nén → toast cộng dồn các tệp.
  await page.getByRole('tab', { name: 'Xuất tệp' }).click()
  await page.getByLabel('Nén ảnh').selectOption('medium')
  await page.getByPlaceholder('Ví dụ: 1-3, 5, 8-10').fill('1-2, 3')
  const t2 = page.getByText(/Đã nén \d+ ảnh|Không nén thêm/)
  const b2 = await t2.count()
  const zip = await download(() => page.getByRole('button', { name: 'Tách và tải .zip' }).click())
  for (let i = 0; i < 100 && (await t2.count()) <= b2; i++) await page.waitForTimeout(100)
  out.splitToast = await t2.last().innerText()
  out.zipBytes = fs.statSync(zip).size
}

out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
