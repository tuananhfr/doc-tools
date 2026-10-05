import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { unzipSync, strFromU8 } = appRequire('fflate')
const { PDFDocument, PDFName, PDFDict } = appRequire('pdf-lib')
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

const OUT = outDir('redaction')
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
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const layer = () => page.locator('.erp-doc-markup')

async function download(click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), click()])
  const path = OUT + `${theme}-${vw}-${dl.suggestedFilename()}`
  await dl.saveAs(path)
  return path
}

async function drag(a, b, steps = 10) {
  const box = await layer().boundingBox()
  const from = [box.x + a[0] * box.width, box.y + a[1] * box.height]
  const to = [box.x + b[0] * box.width, box.y + b[1] * box.height]
  await page.mouse.move(...from)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps)
  await page.mouse.up()
}

async function pageText(path, number) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path)) }).promise
  const content = await (await doc.getPage(number)).getTextContent()
  return content.items.map((item) => item.str).join(' ')
}

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf'])
await page.locator('.erp-doc-page').nth(11).waitFor()
await page.waitForTimeout(1200)

await page.getByRole('button', { name: 'Xem to trang 1', exact: true }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.getByRole('button', { name: 'Đánh dấu', exact: true }).click()
await layer().waitFor()
await page.waitForTimeout(600)

await page.getByRole('button', { name: 'Xoá thật', exact: true }).click()
checks.notice = await page.locator('.erp-doc-markbar__notice--redact').innerText()
checks.colorSwatches = await page.locator('.erp-doc-markbar__swatch').count()
// Dòng "Gói thầu XL-03 · …" (chân chữ y ≈ 0.577 trang): kéo qua chữ → khung bám dòng.
await drag([0.3, 0.572], [0.7, 0.572])
// Một khung tay ở vùng trống cuối trang.
await drag([0.1, 0.88], [0.4, 0.93])
await page.waitForTimeout(300)
checks.redactShapes = await page.locator('.erp-doc-markup .erp-doc-redact').count()
await shot('editor')
await page.getByRole('button', { name: 'Xong' }).click()
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
checks.thumbRedact = await page.locator('.erp-doc-page').first().locator('.erp-doc-redact').count()

const note = page.locator('.erp-doc-export__note--redact')
await note.scrollIntoViewIfNeeded()
checks.exportNote = await note.innerText()
await shot('export-note')

const pdfPath = await download(() => page.getByRole('button', { name: /Tải PDF/ }).click())
const bytes = fs.readFileSync(pdfPath)
const doc = await PDFDocument.load(bytes)
const first = doc.getPage(0)
const xobjects = first.node.Resources()?.lookup(PDFName.of('XObject'), PDFDict)
checks.pdf = {
  pages: doc.getPageCount(),
  kb: Math.round(bytes.length / 1024),
  page1Images: xobjects ? xobjects.keys().length : 0,
  page1Size: first.getSize(),
}
const text1 = await pageText(pdfPath, 1)
const text2 = await pageText(pdfPath, 2)
checks.pdfText = {
  redactedGone: !text1.includes('XL-03') && !text1.includes('Gói thầu'),
  titleKept: text1.includes('Hợp đồng thi công'),
  page2Intact: text2.includes('Gói thầu'),
}

const word = await download(() => page.getByRole('button', { name: 'Tải Word' }).click())
const xml = strFromU8(unzipSync(fs.readFileSync(word))['word/document.xml'])
// Mỗi trang một section: soi riêng trang 1.
const section1 = xml.slice(0, xml.indexOf('<w:sectPr'))
checks.word = { redactedGone: !section1.includes('XL-03'), titleKept: section1.includes('Hợp đồng thi công — trang 1/12'), page2Has: xml.split('<w:sectPr')[1]?.includes('XL-03') }

// Nạp lại tệp đã xuất: tìm chữ đã xoá không ra trên trang 1, chữ ngoài khung vẫn tìm được.
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
const confirm = page.getByRole('button', { name: 'Gỡ hết' })
if (await confirm.count()) await confirm.first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles([pdfPath])
await page.locator('.erp-doc-page').nth(11).waitFor({ timeout: 60000 })
await page.getByRole('tab', { name: 'Tìm' }).click()
const search = page.getByRole('searchbox', { name: 'Tìm trong tài liệu' })
async function hits(term) {
  await search.fill(term)
  await page.getByText(/kết quả|Không tìm thấy/).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(800)
  return { status: await page.locator('.erp-doc-search__status').innerText(), pages: await page.locator('.erp-doc-search__page').allInnerTexts() }
}
checks.reimport = { redacted: await hits('XL-03'), title: await hits('Hợp đồng thi công') }
await page.getByRole('button', { name: 'Xem to trang 1', exact: true }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1200)
await shot('reimport')

console.log(JSON.stringify({ theme, vw, checks, errors }, null, 1))
await browser.close()
