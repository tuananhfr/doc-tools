// EXIF / GPS của ảnh nguồn có đi theo vào tệp kết quả không. Quyết định 03/10/2026: EXIF phải
// ĐƯỢC GIỮ (ảnh hiện trường là bằng chứng) — tệp ra JPG / PDF mà mất chuỗi đánh dấu là hồi quy.
// Ảnh mẫu là JPEG mang khối EXIF có toạ độ GPS + một chuỗi đánh dấu; mỗi công cụ được chạy THẬT,
// tệp tải về được soi BYTE: còn chuỗi đánh dấu = EXIF còn nguyên. Script chỉ báo, không tự đánh trượt.
// ONLY=scan,rotated,editor,convert,compress,crop,pdf,png để chạy riêng.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import zlib from 'node:zlib'
import { chromium, outDir, HUB, BASE } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { unzipSync } = appRequire('fflate')

const OUT = outDir('exif')
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const want = (name) => !only || only.includes(name)

const MARKER = 'ERPCONS-EXIF-GPS-MARKER'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
// Trình chỉnh sửa / Cắt ảnh đang giữ thay đổi thì `goto` bật hộp `beforeunload`.
page.on('dialog', (dialog) => void dialog.accept())
const out = {}

// ---------- Ảnh mẫu ----------

/** Ảnh nhiễu kiểu ảnh chụp, vẽ trong trang. Chất lượng cao = tệp to (nén được); thấp = tệp nhỏ (nén lại chỉ nặng thêm). */
async function makePhoto(width, height, type, quality) {
  const base64 = await page.evaluate(
    async ({ width, height, type, quality }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const c = canvas.getContext('2d')
      const data = c.createImageData(width, height)
      let seed = 12345
      for (let i = 0; i < data.data.length; i += 4) {
        seed = (seed * 1103515245 + 12345) & 0x7fffffff
        const noise = (seed >> 16) & 63
        data.data[i] = ((((i / 4) % width) / width) * 190 + noise) | 0
        data.data[i + 1] = ((i / 4 / width / height) * 190 + noise) | 0
        data.data[i + 2] = 96 + noise
        data.data[i + 3] = 255
      }
      c.putImageData(data, 0, 0)
      const blob = await new Promise((done) => canvas.toBlob(done, type, quality))
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(binary)
    },
    { width, height, type, quality },
  )
  return Buffer.from(base64, 'base64')
}

/**
 * Khối EXIF (TIFF little-endian): IFD0 có Make = MARKER, Orientation = 1 và con trỏ sang IFD GPS
 * (10°46'37" Bắc, 106°42'03" Đông). Hướng khác 1 (ảnh chụp dọc bằng điện thoại) đi đường khác hẳn:
 * bước nạp của `pdf/` và mọi công cụ ảnh vẽ lại qua canvas rồi chép EXIF sang — kiểm riêng ở ca "rotated".
 */
function exifBlock(orientation) {
  const make = Buffer.from(MARKER + '\0', 'latin1')
  const ifd0Size = 2 + 3 * 12 + 4
  const makeAt = 8 + ifd0Size
  const gpsAt = makeAt + make.length + (make.length % 2)
  const gpsSize = 2 + 4 * 12 + 4
  const latAt = gpsAt + gpsSize
  const lonAt = latAt + 24
  const tiff = Buffer.alloc(lonAt + 24)
  tiff.write('II', 0, 'latin1')
  tiff.writeUInt16LE(42, 2)
  tiff.writeUInt32LE(8, 4)

  const entry = (at, tag, type, count, value, inline) => {
    tiff.writeUInt16LE(tag, at)
    tiff.writeUInt16LE(type, at + 2)
    tiff.writeUInt32LE(count, at + 4)
    if (inline) inline(at + 8)
    else tiff.writeUInt32LE(value, at + 8)
  }
  const rationals = (at, values) => values.forEach((value, index) => (tiff.writeUInt32LE(value, at + index * 8), tiff.writeUInt32LE(1, at + index * 8 + 4)))

  tiff.writeUInt16LE(3, 8)
  entry(10, 0x010f, 2, make.length, makeAt)
  entry(22, 0x0112, 3, 1, 0, (at) => tiff.writeUInt16LE(orientation, at))
  entry(34, 0x8825, 4, 1, gpsAt)
  make.copy(tiff, makeAt)

  tiff.writeUInt16LE(4, gpsAt)
  entry(gpsAt + 2, 0x0001, 2, 2, 0, (at) => tiff.write('N\0', at, 'latin1'))
  entry(gpsAt + 14, 0x0002, 5, 3, latAt)
  entry(gpsAt + 26, 0x0003, 2, 2, 0, (at) => tiff.write('E\0', at, 'latin1'))
  entry(gpsAt + 38, 0x0004, 5, 3, lonAt)
  rationals(latAt, [10, 46, 37])
  rationals(lonAt, [106, 42, 3])
  return tiff
}

/** Chèn khối EXIF ngay sau SOI của một JPEG. */
function withGps(jpeg, orientation = 1) {
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'latin1'), exifBlock(orientation)])
  const header = Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 0xff])
  return Buffer.concat([jpeg.subarray(0, 2), header, body, jpeg.subarray(2)])
}

/** Chèn chunk `eXIf` (khối TIFF trần, không có tiền tố của JPEG) ngay sau IHDR của một PNG. */
function pngWithGps(png) {
  const data = exifBlock(1)
  const name = Buffer.from('eXIf', 'latin1')
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(zlib.crc32(Buffer.concat([name, data])))
  return Buffer.concat([png.subarray(0, 33), length, name, data, crc, png.subarray(33)])
}

// ---------- Soi tệp ra ----------

const kindOf = (bytes) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'zip'
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF') return 'webp'
  if (bytes.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf'
  return 'unknown'
}

/** `exif` = còn nguyên khối EXIF mẫu (chuỗi đánh dấu); `exifHeader` = còn BẤT KỲ khối `Exif\0\0` nào (PNG không có tiền tố này). */
function scan(bytes) {
  return { kind: kindOf(bytes), bytes: bytes.length, exif: bytes.includes(Buffer.from(MARKER, 'latin1')), exifHeader: bytes.includes(Buffer.from('Exif\0\0', 'latin1')) }
}

/** Tệp .zip thì soi từng tệp bên trong (zip của công cụ ảnh không nén nên soi thô cũng thấy, nhưng tách ra mới biết ảnh NÀO). */
function scanOutput(bytes) {
  if (kindOf(bytes) !== 'zip') return scan(bytes)
  const entries = unzipSync(bytes)
  return { kind: 'zip', entries: Object.fromEntries(Object.entries(entries).map(([name, data]) => [name, scan(Buffer.from(data))])) }
}

// ---------- Thao tác chung ----------

const file = (name, mimeType, buffer) => ({ name, mimeType, buffer })
const notes = () => page.locator('.erp-flow-note').allInnerTexts()

async function open(slug) {
  await page.goto(`${HUB}/${slug}`)
  await page.locator('.erp-flow-picker').waitFor({ timeout: 30000 })
}

async function add(list) {
  await page.locator('.erp-flow-picker input[type=file]').setInputFiles(list)
  await page.locator('.erp-flow-file').nth(list.length - 1).waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
}

async function run() {
  await page.locator('.erp-flow__run').click()
  await page.locator('.erp-flow-result').waitFor({ timeout: 120000 })
  return { title: await page.locator('.erp-flow-result__title').innerText(), file: await page.locator('.erp-flow-result__file-name').innerText(), notes: await notes() }
}

async function download(button = page.getByRole('button', { name: 'Tải về' })) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), button.click()])
  const path = OUT + dl.suggestedFilename()
  await dl.saveAs(path)
  return { name: dl.suggestedFilename(), ...scanOutput(fs.readFileSync(path)) }
}

await page.goto(HUB)
await page.locator('.erp-tools-grid').waitFor()
// To + chất lượng cao: nén lại nhẹ hơn hẳn. Nhỏ + chất lượng thấp: nén lại chỉ nặng thêm.
const bigGps = withGps(await makePhoto(2400, 1600, 'image/jpeg', 0.98))
const smallGps = withGps(await makePhoto(480, 320, 'image/jpeg', 0.2))
const png = await makePhoto(300, 200, 'image/png')
out.fixture = { big: scan(bigGps), small: scan(smallGps) }

// 1. Scan ảnh → PDF: JPEG được nhúng thẳng vào PDF.
if (want('scan')) {
  await open('anh-sang-pdf')
  await add([file('co-gps.jpg', 'image/jpeg', bigGps)])
  out.scanToPdf = { result: await run(), output: await download() }
}

// 1b. Ảnh có cờ xoay (hướng 6 = chụp dọc): bước nạp vẽ lại ảnh, EXIF phải được chép sang.
if (want('rotated')) {
  const rotated = withGps(await makePhoto(2400, 1600, 'image/jpeg', 0.98), 6)
  await open('anh-sang-pdf')
  await add([file('doc-co-gps.jpg', 'image/jpeg', rotated)])
  out.scanToPdfRotated = { result: await run(), output: await download() }
  await open('nen-anh')
  await add([file('doc-co-gps.jpg', 'image/jpeg', rotated)])
  out.compressRotated = { result: await run(), output: await download() }
}

// 2. Trình chỉnh sửa: thả ảnh rồi xuất PDF (cùng engine với mục 1, khác đường vào).
if (want('editor')) {
  await page.goto(BASE)
  await page.locator('input[type=file]').first().setInputFiles([file('co-gps.jpg', 'image/jpeg', bigGps)])
  await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
  await page.getByRole('tab', { name: 'Xuất tệp' }).click()
  out.editorPdf = { output: await download(page.getByRole('button', { name: /Tải PDF/ })) }
}

// 3. Chuyển đổi ảnh.
if (want('convert')) {
  // 3a. Sang JPG: ảnh đã là JPG được giữ nguyên byte. Phải kèm một PNG — toàn JPG thì nút chạy bị khoá.
  await open('chuyen-doi-anh')
  await add([file('co-gps.jpg', 'image/jpeg', bigGps), file('khong-gps.png', 'image/png', png)])
  await page.getByRole('radio', { name: /^JPG/ }).check()
  out.convertSameFormat = { result: await run(), output: await download() }

  // 3b. Sang PNG: mã hoá lại qua canvas, EXIF được chép sang chunk `eXIf`.
  await open('chuyen-doi-anh')
  await add([file('co-gps.jpg', 'image/jpeg', bigGps)])
  await page.getByRole('radio', { name: /^PNG/ }).check()
  out.convertToPng = { result: await run(), output: await download() }

  // 3c. Sang WebP — đối chứng: EXIF phải mất, và màn kết quả phải nói ra.
  await open('chuyen-doi-anh')
  await add([file('co-gps.jpg', 'image/jpeg', bigGps)])
  await page.getByRole('radio', { name: /^WebP/ }).check()
  out.convertToWebp = { result: await run(), output: await download() }
}

// 4. Nén ảnh.
if (want('compress')) {
  // 4a. Bản nén KHÔNG nhẹ hơn: công cụ trả lại tệp gốc.
  await open('nen-anh')
  await add([file('nho-co-gps.jpg', 'image/jpeg', smallGps)])
  out.compressNotSmaller = { result: await run(), output: await download() }

  // 4b. Bản nén nhẹ hơn: mã hoá lại, EXIF được chép sang.
  await open('nen-anh')
  await add([file('to-co-gps.jpg', 'image/jpeg', bigGps)])
  await page.getByRole('radio', { name: /^Mạnh/ }).check()
  out.compressSmaller = { result: await run(), output: await download() }

  // 4c. Lô lẫn cả hai: màn kết quả có nói ảnh NÀO còn giữ tệp gốc không.
  await open('nen-anh')
  await add([file('nho-co-gps.jpg', 'image/jpeg', smallGps), file('to-co-gps.jpg', 'image/jpeg', bigGps)])
  await page.getByRole('radio', { name: /^Mạnh/ }).check()
  out.compressMixed = { result: await run(), output: await download() }
}

// 5. Cắt & chỉnh ảnh: luôn mã hoá lại, EXIF được chép sang.
if (want('crop')) {
  await open('cat-chinh-anh')
  // Công cụ một ảnh: không có danh sách tệp, ảnh mở thẳng ra vùng cắt.
  await page.locator('.erp-flow-picker input[type=file]').setInputFiles([file('co-gps.jpg', 'image/jpeg', bigGps)])
  await page.getByRole('button', { name: 'Xoay phải' }).click({ timeout: 60000 })
  out.crop = { result: await run(), output: await download() }
}

// 6. Nén PDF: ảnh JPEG trong PDF bị mã hoá lại — EXIF của nó phải còn. PDF mẫu lấy từ chính Scan ảnh → PDF.
if (want('pdf')) {
  await open('anh-sang-pdf')
  await add([file('co-gps.jpg', 'image/jpeg', withGps(await makePhoto(2400, 1600, 'image/jpeg', 0.98), 6))])
  await run()
  const scanned = await download()
  await open('nen-pdf')
  await add([file('scan.pdf', 'application/pdf', fs.readFileSync(OUT + scanned.name))])
  await page.getByRole('radio', { name: /^Mạnh/ }).check()
  out.compressPdf = { source: scanned, result: await run(), output: await download() }
}

// 7. Nguồn PNG mang `eXIf`: ra JPG và ra PNG (đổi cỡ qua Nén ảnh) đều phải còn.
if (want('png')) {
  const pngGps = pngWithGps(await makePhoto(1200, 800, 'image/png'))
  out.pngFixture = scan(pngGps)
  await open('chuyen-doi-anh')
  await add([file('png-co-gps.png', 'image/png', pngGps)])
  await page.getByRole('radio', { name: /^JPG/ }).check()
  out.pngToJpg = { result: await run(), output: await download() }
}

console.log(JSON.stringify({ checks: out, errors }, null, 2))
await browser.close()
