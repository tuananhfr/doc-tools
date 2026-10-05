// "Ảnh hàng loạt", "Che & đóng dấu ảnh", "Ảnh thẻ & In ảnh". Mỗi công cụ chạy THẬT rồi mở tệp tải về
// ra soi: tên + kích thước từng ảnh trong .zip, màu điểm ảnh dưới khung che, khổ trang PDF, mật độ JPG.
// Cần tệp mẫu: node scripts/doc-tools/make-fixtures.mjs
//
//   THEME=dark VIEW=360x800 ONLY=batch,mark,photo node scripts/doc-tools/check-image-extra.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, outDir, HUB, FIX } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument } = appRequire('pdf-lib')
const { unzipSync } = appRequire('fflate')

const OUT = outDir('image-extra')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const want = (name) => !only || only.includes(name)

let stage = 'init'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
page.on('console', (m) => m.type() === 'error' && errors.push(`${stage}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => errors.push(`${stage}: ${String(e)}`))
// Che & đóng dấu đang có thay đổi thì `goto` bật hộp `beforeunload`.
page.on('dialog', (dialog) => void dialog.accept())

const out = { theme, vw }
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, fullPage: true })
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
const field = (label) => page.getByLabel(label, { exact: true })
const text = async (selector) => ((await page.locator(selector).count()) ? (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ').trim() : null)
const touch = () => page.locator('.erp-flow__side select, .erp-flow__side input[type=text], .erp-flow__side .btn').evaluateAll((items) => Math.min(...items.filter((item) => item.offsetParent).map((item) => Math.round(item.getBoundingClientRect().height))))

async function open(slug) {
  stage = slug
  await page.goto(`${HUB}/${slug}`)
  await page.evaluate((t) => {
    const raw = localStorage.getItem('erpcons.app')
    const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    data.state.theme = t
    localStorage.setItem('erpcons.app', JSON.stringify(data))
  }, theme)
  await page.reload()
  await page.locator('.erp-flow-picker').first().waitFor({ timeout: 30000 })
}

const add = (names) => page.locator('.erp-flow-picker input[type=file]').setInputFiles(names.map((name) => FIX + name))

async function run() {
  const blocked = await text('.erp-flow__hint')
  await page.getByRole('button', { name: /^(Xử lý|Lưu ảnh|Tạo)/ }).first().click()
  await page.getByRole('button', { name: 'Tải về' }).waitFor({ timeout: 120000 })
  return { blocked, title: await text('.erp-flow-result__title'), notes: await page.locator('.erp-flow-result__notes li').allInnerTexts() }
}

async function download() {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Tải về' }).click()])
  const saved = OUT + dl.suggestedFilename()
  await dl.saveAs(saved)
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(saved) }
}

/** Giải mã ảnh trong trang: kích thước + màu tại các điểm (theo tỉ lệ 0–1). */
async function inspect(bytes, points = []) {
  return page.evaluate(
    async ({ base64, points }) => {
      const blob = await (await fetch(`data:application/octet-stream;base64,${base64}`)).blob()
      const bitmap = await createImageBitmap(blob)
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const c = canvas.getContext('2d')
      c.drawImage(bitmap, 0, 0)
      return {
        width: bitmap.width,
        height: bitmap.height,
        pixels: points.map(([fx, fy]) => Array.from(c.getImageData(Math.floor(fx * bitmap.width), Math.floor(fy * bitmap.height), 1, 1).data.slice(0, 3))),
      }
    },
    { base64: bytes.toString('base64'), points },
  )
}

const hasExif = (bytes) => bytes.includes(Buffer.from('Exif\0\0')) || bytes.includes(Buffer.from('eXIf'))

// ---------- 1. Ảnh hàng loạt ----------
if (want('batch')) {
  const o = (out.batch = {})
  await open('anh-hang-loat')
  await add(['anh-hien-truong.jpg', 'anh-exif6.jpg', 'so-do-trong-suot.png'])
  await page.locator('.erp-flow-file').nth(2).waitFor({ timeout: 60000 })
  o.files = await page.locator('.erp-flow-file').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ')))
  o.defaults = { mode: await field('Đổi kích thước').inputValue(), edge: await field('Cạnh dài tối đa').inputValue(), format: await field('Định dạng ra').inputValue(), pattern: await field('Mẫu tên tệp').inputValue(), sample: await text('.erp-image-output') }

  await field('Cạnh dài tối đa').fill('abc')
  o.badValue = { marked: await field('Cạnh dài tối đa').evaluate((el) => el.classList.contains('is-invalid')), runDisabled: await page.getByRole('button', { name: /^Xử lý/ }).isDisabled() }
  await field('Cạnh dài tối đa').fill('400')
  await field('Mẫu tên tệp').fill('a/b')
  o.badPattern = { marked: await field('Mẫu tên tệp').evaluate((el) => el.classList.contains('is-invalid')), runDisabled: await page.getByRole('button', { name: /^Xử lý/ }).isDisabled() }
  await field('Mẫu tên tệp').fill('cong-trinh-{n}')
  await field('Số bắt đầu').fill('9')
  await field('Định dạng ra').selectOption('jpeg')
  o.sample = await text('.erp-image-output')
  o.touch = await touch()
  await shot('batch-options')

  o.result = await run()
  const zip = await download()
  o.zipName = zip.name
  const entries = unzipSync(new Uint8Array(zip.bytes))
  o.entries = []
  for (const [name, bytes] of Object.entries(entries)) {
    const info = await inspect(Buffer.from(bytes))
    o.entries.push({ name, size: `${info.width}x${info.height}`, jpeg: bytes[0] === 0xff && bytes[1] === 0xd8, exif: hasExif(Buffer.from(bytes)) })
  }
  await shot('batch-result')
  o.overflow = await overflow()

  // Giữ nguyên cỡ + định dạng + chỉ đổi tên: tệp ra phải y hệt tệp gốc từng byte.
  await open('anh-hang-loat')
  await add(['anh-hien-truong.jpg'])
  await page.locator('.erp-flow-file').first().waitFor({ timeout: 60000 })
  await field('Đổi kích thước').selectOption('keep')
  await field('Mẫu tên tệp').fill('ban-goc')
  o.renameOnly = await run()
  const same = await download()
  o.renameOnlyFile = { name: same.name, identical: Buffer.compare(same.bytes, fs.readFileSync(FIX + 'anh-hien-truong.jpg')) === 0 }
}

// ---------- 2. Che & đóng dấu ảnh ----------
if (want('mark')) {
  const o = (out.mark = {})
  await open('che-dong-dau-anh')
  await add(['anh-hien-truong.jpg'])
  const frame = page.locator('.erp-mark')
  await frame.waitFor({ timeout: 60000 })
  o.blockedAtStart = await page.getByRole('button', { name: 'Lưu ảnh' }).isDisabled()
  await frame.scrollIntoViewIfNeeded()
  const drag = async (fx1, fy1, fx2, fy2) => {
    const box = await frame.boundingBox()
    await page.mouse.move(box.x + box.width * fx1, box.y + box.height * fy1)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * fx2, box.y + box.height * fy2, { steps: 6 })
    await page.mouse.up()
  }
  await drag(0.1, 0.1, 0.4, 0.3)
  await drag(0.6, 0.6, 0.9, 0.8)
  await drag(0.5, 0.1, 0.502, 0.102)
  o.afterDraw = { boxes: await page.locator('.erp-mark__box').count(), meta: await text('.erp-image-stage__meta') }
  // Bấm vào khung thứ hai là bỏ nó.
  const box = await frame.boundingBox()
  await page.mouse.click(box.x + box.width * 0.75, box.y + box.height * 0.7)
  o.afterPick = await page.locator('.erp-mark__box').count()

  await field('Chữ đóng dấu (không bắt buộc)').fill('BẢN NHÁP')
  await field('Vị trí dấu').selectOption('bottomRight')
  await field('Màu chữ').selectOption('red')
  await page.waitForTimeout(300)
  o.touch = await touch()
  await frame.scrollIntoViewIfNeeded()
  await shot('mark-stage')
  o.overflow = await overflow()

  o.result = await run()
  const file = await download()
  const source = await inspect(fs.readFileSync(FIX + 'anh-hien-truong.jpg'), [[0.25, 0.2]])
  const made = await inspect(file.bytes, [[0.25, 0.2], [0.11, 0.11], [0.39, 0.29], [0.75, 0.7], [0.5, 0.5]])
  const sourceMiddle = (await inspect(fs.readFileSync(FIX + 'anh-hien-truong.jpg'), [[0.5, 0.5]])).pixels[0]
  o.file = {
    name: file.name,
    sameSize: made.width === source.width && made.height === source.height,
    size: `${made.width}x${made.height}`,
    insideBox: made.pixels.slice(0, 3),
    // Khối đen JPEG: mọi kênh gần 0.
    redacted: made.pixels.slice(0, 3).every((pixel) => pixel.every((value) => value < 24)),
    sourceWasNotBlack: source.pixels[0].some((value) => value > 40),
    removedBoxPixel: made.pixels[3],
    middleUntouched: made.pixels[4].every((value, index) => Math.abs(value - sourceMiddle[index]) < 12),
    exif: hasExif(file.bytes),
  }
  await shot('mark-result')

  // Dấu lặp chéo, không khung che.
  await open('che-dong-dau-anh')
  await add(['so-do-trong-suot.png'])
  await page.locator('.erp-mark').waitFor({ timeout: 60000 })
  await field('Chữ đóng dấu (không bắt buộc)').fill('ERPCons')
  await field('Lặp chéo khắp ảnh').check()
  o.tileHidesAnchor = (await field('Vị trí dấu').count()) === 0
  await page.waitForTimeout(300)
  await page.locator('.erp-mark').scrollIntoViewIfNeeded()
  await shot('mark-tile')
  o.tile = await run()
  const tiled = await download()
  o.tileFile = { name: tiled.name, png: tiled.bytes[0] === 0x89 && tiled.bytes[1] === 0x50 }
}

// ---------- 3. Ảnh thẻ & In ảnh ----------
if (want('photo')) {
  const o = (out.photo = {})
  await open('anh-the')
  await add(['anh-hien-truong.jpg'])
  await page.locator('.erp-crop').waitFor({ timeout: 60000 })
  o.defaults = { photo: await field('Cỡ ảnh thẻ').inputValue(), paper: await field('Khổ giấy').inputValue(), fill: await text('label[for$="-fill"]'), run: await page.getByRole('button', { name: /^Tạo/ }).innerText(), cells: await page.locator('.erp-photo-sheet__cell').count(), hint: await page.locator('.erp-flow__side .erp-flow-field__hint').last().innerText() }
  o.touch = await touch()
  await shot('photo-stage')
  o.overflow = await overflow()

  o.pdf = await run()
  const pdfFile = await download()
  const pdf = await PDFDocument.load(pdfFile.bytes)
  const first = pdf.getPage(0)
  const mm = (pt) => Math.round((pt / 72) * 25.4 * 10) / 10
  const text0 = Buffer.from(pdfFile.bytes).toString('latin1')
  o.pdfFile = { name: pdfFile.name, pages: pdf.getPageCount(), paperMm: [mm(first.getWidth()), mm(first.getHeight())], imageObjects: (text0.match(/\/Subtype\s*\/Image/g) ?? []).length, kb: Math.round(pdfFile.bytes.length / 1024) }
  await shot('photo-result')

  // Tờ JPG trên giấy ảnh 10 × 15, 4 bản ảnh 4 × 6.
  await open('anh-the')
  await add(['anh-hien-truong.jpg'])
  await page.locator('.erp-crop').waitFor({ timeout: 60000 })
  await field('Cỡ ảnh thẻ').selectOption('4x6')
  await page.getByText('Tờ in JPG').click()
  await field('Khổ giấy').selectOption('10x15')
  o.small = { fill: await text('label[for$="-fill"]'), cells: await page.locator('.erp-photo-sheet__cell').count() }
  await field('Xếp kín tờ (4 ảnh)').uncheck()
  await field('Số bản').fill('9')
  o.tooMany = { runDisabled: await page.getByRole('button', { name: /^Tạo/ }).isDisabled(), marked: await field('Số bản').evaluate((el) => el.classList.contains('is-invalid')) }
  await field('Số bản').fill('2')
  o.two = { cells: await page.locator('.erp-photo-sheet__cell').count(), run: await page.getByRole('button', { name: /^Tạo/ }).innerText() }
  o.sheet = await run()
  const sheet = await download()
  const sheetInfo = await inspect(sheet.bytes, [[0.02, 0.02], [0.5, 0.5]])
  o.sheetFile = { name: sheet.name, size: `${sheetInfo.width}x${sheetInfo.height}`, expected: `${Math.round((102 / 25.4) * 300)}x${Math.round((152 / 25.4) * 300)}`, density: [sheet.bytes[13], sheet.bytes.readUInt16BE(14), sheet.bytes.readUInt16BE(16)], cornerIsPaper: sheetInfo.pixels[0].every((value) => value > 240) }

  // Một ảnh thẻ 3 × 4.
  await open('anh-the')
  await add(['anh-hien-truong.jpg'])
  await page.locator('.erp-crop').waitFor({ timeout: 60000 })
  await page.getByText('Một ảnh thẻ').click()
  o.singleHidesPaper = (await field('Khổ giấy').count()) === 0
  o.single = await run()
  const single = await download()
  const singleInfo = await inspect(single.bytes)
  o.singleFile = { name: single.name, size: `${singleInfo.width}x${singleInfo.height}`, ratio: Math.round((singleInfo.width / singleInfo.height) * 1000) / 1000, exif: hasExif(single.bytes) }
}

await browser.close()
console.log(JSON.stringify({ ...out, errors }, null, 1))
if (errors.length) process.exitCode = 1
