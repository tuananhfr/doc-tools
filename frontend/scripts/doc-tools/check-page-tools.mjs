// Năm công cụ PDF làm trên TỪNG TRANG của "Chuyện Nhỏ": PDF → Ảnh, Sắp xếp PDF, Đánh số trang,
// Đóng dấu PDF, Che thông tin PDF. Mỗi công cụ được chạy THẬT rồi mở tệp tải về ra soi.
//
// Phần "Che thông tin" là bài thử KHÔI PHỤC: tệp ra không được còn chữ dưới khung (đọc bằng pdf.js),
// không được còn luồng nội dung của trang gốc, và trang đã che chỉ gồm MỘT ảnh.
//
//   THEME=dark VIEW=360x780 node scripts/doc-tools/check-page-tools.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, HUB } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument, PDFName, PDFDict, PDFRawStream, PDFArray, decodePDFRawStream } = appRequire('pdf-lib')
const { unzipSync } = appRequire('fflate')
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

const OUT = outDir('page-tools')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
page.on('dialog', (dialog) => dialog.accept())
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, fullPage: true })
const out = { theme, vw }

async function open(slug) {
  await page.goto(`${HUB}/${slug}`)
  await page.evaluate((t) => {
    const raw = localStorage.getItem('erpcons.app')
    const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    data.state.theme = t
    localStorage.setItem('erpcons.app', JSON.stringify(data))
  }, theme)
  await page.reload()
  await page.locator('.erp-flow-picker').waitFor({ timeout: 30000 })
}

const add = (name) => page.locator('.erp-flow-picker input[type=file]').setInputFiles([FIX + name])

async function run(timeout = 180000) {
  await page.locator('.erp-flow__run').click()
  await page.locator('.erp-flow-result').waitFor({ timeout })
  return { title: await page.locator('.erp-flow-result__title').innerText(), notes: await page.locator('.erp-flow-note').allInnerTexts() }
}

async function download() {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Tải về' }).click()])
  const saved = `${OUT}${theme}-${vw}-${dl.suggestedFilename()}`
  await dl.saveAs(saved)
  return saved
}

async function pageTexts(path) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path)), verbosity: 0 }).promise
  const texts = []
  for (let n = 1; n <= doc.numPages; n++) texts.push((await (await doc.getPage(n)).getTextContent()).items.map((item) => item.str).join(' '))
  await doc.loadingTask.destroy()
  return texts
}

const imagesOn = (pdfPage) => {
  const xobjects = pdfPage.node.Resources()?.lookupMaybe(PDFName.of('XObject'), PDFDict)
  return xobjects ? xobjects.keys().length : 0
}

/** Mọi luồng nội dung của một trang, đã giải nén. */
function contentOf(pdfPage) {
  const contents = pdfPage.node.Contents()
  const streams = contents instanceof PDFArray ? contents.asArray().map((ref) => pdfPage.doc.context.lookup(ref)) : contents ? [contents] : []
  return Buffer.concat(streams.map((stream) => Buffer.from(stream instanceof PDFRawStream ? decodePDFRawStream(stream).decode() : stream.getContents())))
}

/** Kích thước khung vừa với cả tổ hợp hẹp: trang vẽ theo bề rộng cột. */
async function drag(a, b) {
  const layer = page.locator('.erp-redact')
  await layer.scrollIntoViewIfNeeded()
  const box = await layer.boundingBox()
  const from = [box.x + a[0] * box.width, box.y + a[1] * box.height]
  const to = [box.x + b[0] * box.width, box.y + b[1] * box.height]
  await page.mouse.move(...from)
  await page.mouse.down()
  for (let i = 1; i <= 8; i++) await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 8, from[1] + ((to[1] - from[1]) * i) / 8)
  await page.mouse.up()
}

const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)

// ---------- PDF → Ảnh ----------
await open('pdf-sang-anh')
await add('hop-dong.pdf')
await page.locator('.erp-flow-file').first().waitFor({ timeout: 60000 })
await page.getByRole('radio', { name: /^PNG/ }).check()
await page.getByLabel('Độ phân giải').selectOption('96')
out.toImage = { label: await page.locator('.erp-flow__run').innerText(), ...(await run()) }
{
  const names = Object.keys(unzipSync(fs.readFileSync(await download())))
  out.toImage.entries = names.length
  out.toImage.allPng = names.every((name) => name.endsWith('.png'))
}

// ---------- Sắp xếp PDF ----------
await open('sap-xep-pdf')
await add('hop-dong.pdf')
await page.locator('.erp-organize__tile').nth(11).waitFor({ timeout: 60000 })
out.organize = { blockedAtStart: await page.locator('.erp-flow__run').isDisabled() }
await page.getByRole('button', { name: 'Dời trang 1 ra sau', exact: true }).click()
await page.getByRole('button', { name: 'Xoay trang 3 sang phải', exact: true }).click()
await page.getByRole('button', { name: 'Bỏ trang 12', exact: true }).click()
await page.locator('.erp-organize__frame img').first().waitFor({ timeout: 60000 })
await page.waitForTimeout(800)
out.organize.meta = await page.locator('.erp-page-stage__meta').innerText()
out.organize.overflow = await overflow()
out.organize.buttonHeights = [...new Set(await page.locator('.erp-organize__button').evaluateAll((items) => items.map((item) => Math.round(item.getBoundingClientRect().height))))]
await shot('organize')
Object.assign(out.organize, await run())
{
  const path = await download()
  const doc = await PDFDocument.load(fs.readFileSync(path))
  const texts = await pageTexts(path)
  out.organize.pages = doc.getPageCount()
  out.organize.rotations = doc.getPages().map((item) => item.getRotation().angle)
  out.organize.swapped = texts[0].includes('trang 2/12') && texts[1].includes('trang 1/12')
  out.organize.lastDropped = !texts.some((text) => text.includes('trang 12/12'))
}

// ---------- Đánh số trang ----------
await open('danh-so-trang')
await add('hop-dong.pdf')
await page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })
await page.getByLabel('Kiểu số').selectOption('- {n} -')
await page.getByLabel('Số bắt đầu').fill('5')
await page.getByRole('combobox', { name: 'Vị trí' }).selectOption('bottomRight')
await page.waitForTimeout(500)
out.numbers = { preview: await page.locator('.erp-doc-stamp text').allTextContents(), overflow: await overflow() }
await shot('numbers')
Object.assign(out.numbers, await run())
{
  const texts = await pageTexts(await download())
  out.numbers.first = texts[0].includes('- 5 -')
  out.numbers.last = texts[11].includes('- 16 -')
}

// ---------- Đóng dấu PDF: dấu chữ ----------
await open('dong-dau-pdf')
await add('hop-dong.pdf')
await page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })
await page.waitForTimeout(500)
out.stampText = { preview: await page.locator('.erp-doc-stamp text').allTextContents() }
await shot('stamp-text')
Object.assign(out.stampText, await run())
{
  const texts = await pageTexts(await download())
  out.stampText.onEveryPage = texts.every((text) => text.includes('BẢN SAO'))
}

// ---------- Đóng dấu PDF: dấu ảnh, bỏ trang đầu ----------
await page.getByRole('button', { name: /Làm lại|Làm tệp khác|Bắt đầu lại/ }).first().click()
await page.locator('.erp-flow-picker').waitFor()
await page.getByRole('radio', { name: /Dấu ảnh/ }).check()
out.stampImage = { blockedWithoutImage: await page.locator('.erp-flow__run').isDisabled() }
const logo = await page.evaluate(() => {
  const canvas = document.createElement('canvas')
  canvas.width = 300
  canvas.height = 120
  const c = canvas.getContext('2d')
  c.strokeStyle = '#c8202a'
  c.lineWidth = 10
  c.strokeRect(8, 8, 284, 104)
  c.fillStyle = '#c8202a'
  c.font = 'bold 44px sans-serif'
  c.textAlign = 'center'
  c.fillText('ĐÃ DUYỆT', 150, 78)
  return canvas.toDataURL('image/png').split(',')[1]
})
await page.getByLabel('Ảnh dấu').setInputFiles([{ name: 'dau.png', mimeType: 'image/png', buffer: Buffer.from(logo, 'base64') }])
await page.locator('.erp-page-stage__stamp').waitFor({ timeout: 30000 })
await page.getByLabel('Áp lên').selectOption('skipFirst')
await page.waitForTimeout(500)
out.stampImage.previewCaption = await page.locator('.erp-page-stage__meta').innerText()
{
  // Dấu nằm TRONG tờ giấy, sát góc dưới-phải.
  const frame = await page.locator('.erp-page-stage__frame').boundingBox()
  const stamp = await page.locator('.erp-page-stage__stamp').boundingBox()
  out.stampImage.inside = stamp.x >= frame.x && stamp.y >= frame.y && stamp.x + stamp.width <= frame.x + frame.width + 0.5 && stamp.y + stamp.height <= frame.y + frame.height + 0.5
  out.stampImage.widthShare = Number((stamp.width / frame.width).toFixed(2))
}
await shot('stamp-image')
Object.assign(out.stampImage, await run())
{
  const source = await PDFDocument.load(fs.readFileSync(FIX + 'hop-dong.pdf'))
  const doc = await PDFDocument.load(fs.readFileSync(await download()))
  const added = doc.getPages().map((item, index) => imagesOn(item) - imagesOn(source.getPage(index)))
  out.stampImage.added = [...new Set(added.slice(1))]
  out.stampImage.firstSkipped = added[0] === 0
}

// ---------- Che thông tin PDF ----------
await open('che-thong-tin-pdf')
await add('hop-dong.pdf')
await page.locator('.erp-redact').waitFor({ timeout: 60000 })
out.redact = { blockedAtStart: await page.locator('.erp-flow__run').isDisabled() }
// Dòng "Gói thầu XL-03 · …" (chân chữ y ≈ 0,577 trang).
await drag([0.08, 0.55], [0.92, 0.6])
await drag([0.1, 0.85], [0.4, 0.9])
out.redact.drawn = await page.locator('.erp-redact__box').count()
// Bấm vào khung thứ hai là bỏ khung đó.
{
  const box = await page.locator('.erp-redact__box').nth(1).boundingBox()
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
}
out.redact.afterClick = await page.locator('.erp-redact__box').count()
out.redact.meta = await page.locator('.erp-page-stage__meta').innerText()
out.redact.overflow = await overflow()
await shot('redact')
await page.getByRole('button', { name: 'Trang sau' }).click()
await page.locator('.erp-redact').waitFor({ timeout: 30000 })
out.redact.page2Boxes = await page.locator('.erp-redact__box').count()
Object.assign(out.redact, await run())
{
  const path = await download()
  const texts = await pageTexts(path)
  const source = await PDFDocument.load(fs.readFileSync(FIX + 'hop-dong.pdf'))
  const doc = await PDFDocument.load(fs.readFileSync(path))
  const original = contentOf(source.getPage(0))
  const probe = original.subarray(0, Math.min(120, original.length))
  // Soi MỌI luồng trong tệp ra, không chỉ luồng của trang 1: nội dung gốc còn sót ở đâu cũng là lộ.
  let leaked = 0
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue
    let bytes
    try {
      bytes = Buffer.from(decodePDFRawStream(object).decode())
    } catch {
      continue // ảnh JPEG: không phải luồng nội dung
    }
    if (bytes.includes(probe)) leaked++
  }
  // Phép thử phải tự chứng minh là nó bắt được: trang 2 không che thì luồng gốc của nó PHẢI còn.
  const control = contentOf(source.getPage(1))
  const controlProbe = control.subarray(0, Math.min(120, control.length))
  const streams = []
  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue
    try {
      streams.push(Buffer.from(decodePDFRawStream(object).decode()))
    } catch {
      // ảnh JPEG
    }
  }
  const first = doc.getPage(0)
  out.redact.recovery = {
    oracleFindsUntouchedPage: streams.some((bytes) => bytes.includes(controlProbe)),
    probesDiffer: !probe.equals(controlProbe),
    redactedTextGone: !texts[0].includes('XL-03') && !texts[0].includes('Gói thầu'),
    outsideTextKept: texts[0].includes('Hợp đồng thi công'),
    otherPagesIntact: texts.slice(1).every((text) => text.includes('XL-03')),
    originalStreamLeaked: leaked,
    probeBytes: probe.length,
    page1Images: imagesOn(first),
    page1SameSize: Math.round(first.getWidth()) === Math.round(source.getPage(0).getWidth()),
    pages: doc.getPageCount(),
    author: doc.getAuthor() ?? null,
  }
}
await shot('redact-result')

console.log(JSON.stringify({ out, errors }, null, 1))
await browser.close()
