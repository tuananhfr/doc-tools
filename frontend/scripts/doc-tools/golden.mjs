// Golden baseline của "Chuyện Nhỏ" (gate G1, v2.0 §6: golden tests TRƯỚC khi refactor).
// Chạy THẬT từng công cụ với tệp mẫu + tuỳ chọn cố định, rút "chữ ký" của kết quả rồi so với
// `golden/baseline.json`.
//
//   node scripts/doc-tools/golden.mjs            so với baseline
//   UPDATE=1 node scripts/doc-tools/golden.mjs   ghi lại baseline (thay đổi CÓ CHỦ Ý)
//   ONLY=ghep-pdf,nen-anh                        chạy riêng (UPDATE chỉ ghi đè các mục đó)
//
// KHÁC các script check-*: script này TỰ ĐÁNH TRƯỢT — mã thoát 1 khi kết quả lệch baseline,
// 2 khi không so được (công cụ không chạy xong, tệp mẫu đã đổi, chưa có baseline).
//
// So chữ ký NỘI DUNG chứ không so hash byte: PDF do app dựng mang ngày giờ nên byte lần nào
// cũng khác. `info` (thời gian, dung lượng) chỉ để tham khảo, không đem so.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { chromium, FIX, HUB, outDir } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument, PDFName, PDFRawStream } = appRequire('pdf-lib')
const { unzipSync, strFromU8 } = appRequire('fflate')
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

const OUT = outDir('golden')
const BASELINE = path.join(import.meta.dirname, 'golden', 'baseline.json')
const update = process.env.UPDATE === '1'
const only = process.env.ONLY ? process.env.ONLY.split(',') : null

/** Số ký tự chữ giữ lại trong chữ ký — đủ để thấy lệch, không làm baseline phình. */
const TEXT_KEEP = 1500
/** Chữ giống nhau từ mức này trở lên là khớp: OCR và thứ tự mảnh chữ của pdf.js có thể xê dịch vài từ. */
const TEXT_SIMILARITY = 0.97
/** Sai khác cho phép trên mỗi kênh màu của một ô lưới: bộ mã hoá JPEG của các bản Chrome lệch nhau vài đơn vị. */
const GRID_TOLERANCE = 8

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
page.on('dialog', (dialog) => void dialog.accept())
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

// ---------- Chữ ký ----------

const squash = (text) => text.replace(/\s+/g, ' ').trim()
const textSig = (text) => ({ textLength: squash(text).length, text: squash(text).slice(0, TEXT_KEEP) })

const kindOf = (bytes) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png'
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF') return 'webp'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'zip'
  if (bytes.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf'
  return 'text'
}

async function pdfSig(bytes) {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false })
  const images = doc.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')).length
  let fields = 0
  try {
    fields = doc.getForm().getFields().length
  } catch {
    // tệp không có form
  }
  const loaded = await pdfjs.getDocument({ data: new Uint8Array(bytes), useSystemFonts: false, verbosity: 0 }).promise
  let text = ''
  for (let n = 1; n <= loaded.numPages; n++) text += (await (await loaded.getPage(n)).getTextContent()).items.map((item) => item.str).join(' ') + '\n'
  await loaded.loadingTask.destroy()
  const sizes = doc.getPages().map((item) => `${Math.round(item.getWidth())}x${Math.round(item.getHeight())}/${item.getRotation().angle}`)
  return { kind: 'pdf', pages: sizes.length, sizes: [...new Set(sizes)], images, fields, ...textSig(text) }
}

/** Kích thước + màu trung bình trên lưới 4 × 4 (giải mã trong trang: node không có canvas). */
async function imageSig(bytes) {
  const data = await page.evaluate(async (base64) => {
    const binary = atob(base64)
    const raw = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) raw[i] = binary.charCodeAt(i)
    const bitmap = await createImageBitmap(new Blob([raw]))
    const canvas = document.createElement('canvas')
    canvas.width = 4
    canvas.height = 4
    const c = canvas.getContext('2d')
    c.imageSmoothingQuality = 'high'
    c.fillStyle = '#fff'
    c.fillRect(0, 0, 4, 4)
    c.drawImage(bitmap, 0, 0, 4, 4)
    const pixels = c.getImageData(0, 0, 4, 4).data
    const grid = []
    for (let i = 0; i < pixels.length; i += 4) grid.push(pixels[i], pixels[i + 1], pixels[i + 2])
    return { width: bitmap.width, height: bitmap.height, grid }
  }, bytes.toString('base64'))
  return { kind: kindOf(bytes), ...data }
}

function officeSig(name, entries) {
  const strip = (xml) => xml.replace(/<[^>]+>/g, ' ')
  if (entries['word/document.xml']) return { kind: 'docx', ...textSig(strip(strFromU8(entries['word/document.xml']))) }
  const sheets = Object.keys(entries).filter((entry) => /^xl\/worksheets\/sheet\d+\.xml$/.test(entry))
  const cells = sheets.reduce((sum, sheet) => sum + (strFromU8(entries[sheet]).match(/<c /g)?.length ?? 0), 0)
  return { kind: 'xlsx', sheets: sheets.length, cells, ...textSig(entries['xl/sharedStrings.xml'] ? strip(strFromU8(entries['xl/sharedStrings.xml'])) : '') }
}

async function fileSig(name, bytes) {
  const kind = kindOf(bytes)
  if (kind === 'pdf') return pdfSig(bytes)
  if (kind === 'jpeg' || kind === 'png' || kind === 'webp') return imageSig(bytes)
  if (kind === 'zip') {
    const entries = unzipSync(bytes)
    if (/\.(docx|xlsx)$/i.test(name)) return officeSig(name, entries)
    const names = Object.keys(entries).sort()
    const inside = {}
    for (const entry of names) inside[entry] = await fileSig(entry, Buffer.from(entries[entry]))
    return { kind: 'zip', entries: inside }
  }
  return { kind: 'text', ...textSig(bytes.toString('utf8')) }
}

// ---------- So sánh ----------

function similarity(a, b) {
  if (a === b) return 1
  const count = (text) => text.split(' ').reduce((map, word) => map.set(word, (map.get(word) ?? 0) + 1), new Map())
  const [left, right] = [count(a), count(b)]
  let shared = 0
  for (const [word, n] of left) shared += Math.min(n, right.get(word) ?? 0)
  const total = [...left.values(), ...right.values()].reduce((sum, n) => sum + n, 0)
  return total === 0 ? 1 : (2 * shared) / total
}

/** Trả về danh sách chỗ lệch; rỗng = khớp. */
function diff(expected, actual, at = '') {
  if (at.endsWith('.text') && typeof expected === 'string' && typeof actual === 'string') {
    const score = similarity(expected, actual)
    return score >= TEXT_SIMILARITY ? [] : [`${at}: chữ chỉ giống ${Math.round(score * 100)}%`]
  }
  if (at.endsWith('.textLength') && typeof expected === 'number' && typeof actual === 'number') {
    return Math.abs(expected - actual) <= Math.max(5, expected * 0.03) ? [] : [`${at}: ${expected} -> ${actual}`]
  }
  if (at.endsWith('.grid') && Array.isArray(expected) && Array.isArray(actual) && expected.length === actual.length) {
    const worst = Math.max(...expected.map((value, index) => Math.abs(value - actual[index])))
    return worst <= GRID_TOLERANCE ? [] : [`${at}: màu lệch tới ${worst}`]
  }
  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) return [`${at}: ${expected.length} mục -> ${actual.length} mục`]
    return expected.flatMap((item, index) => diff(item, actual[index], `${at}[${index}]`))
  }
  if (expected && actual && typeof expected === 'object' && typeof actual === 'object') {
    return [...new Set([...Object.keys(expected), ...Object.keys(actual)])].flatMap((key) => diff(expected[key], actual[key], `${at}.${key}`))
  }
  return expected === actual ? [] : [`${at}: ${JSON.stringify(expected)} -> ${JSON.stringify(actual)}`]
}

// ---------- Thao tác chung ----------

const field = (label) => page.getByLabel(label, { exact: true })
const text = async (selector) => squash(await page.locator(selector).first().innerText())
const inputs = []
const fix = (name) => (inputs.push(name), FIX + name)

async function open(slug, ready = '.erp-flow-picker') {
  await page.goto(`${HUB}/${slug}`)
  await page.locator(ready).first().waitFor({ timeout: 30000 })
}

async function add(names, listed = true) {
  await page.locator('.erp-flow-picker input[type=file]').setInputFiles(names.map(fix))
  if (listed) await page.locator('.erp-flow-file').nth(names.length - 1).waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
}

let timing = null

async function run(timeout = 180000) {
  const started = Date.now()
  await page.locator('.erp-flow__run').click()
  await page.locator('.erp-flow-result').waitFor({ timeout })
  timing = Date.now() - started
  return { title: await text('.erp-flow-result__title') }
}

let outBytes = null

async function download(button = page.getByRole('button', { name: 'Tải về' })) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), button.click()])
  const saved = OUT + dl.suggestedFilename()
  await dl.saveAs(saved)
  const bytes = fs.readFileSync(saved)
  outBytes = bytes.length
  return { name: dl.suggestedFilename(), bytes, ...(await fileSig(dl.suggestedFilename(), bytes)) }
}

/** `bytes` là Buffer thô để công cụ sau dùng lại (mã QR) — không vào chữ ký. */
const strip = ({ bytes: _bytes, ...signature }) => signature

/**
 * OCR v2 dừng ở bước soát chữ trước khi xuất: xác nhận NGUYÊN giá trị máy đọc (không sửa) để chữ ký
 * vẫn là chữ OCR như baseline. Nút xác nhận tự nhảy sang chữ cần soát kế tiếp.
 */
async function ocrRun(timeout = 180000) {
  const started = Date.now()
  await page.locator('.erp-flow__run').click()
  await page.locator('.cn-ocr-review, .erp-flow-result').first().waitFor({ timeout })
  if (await page.locator('.cn-ocr-review').count()) {
    const pending = page.locator('.cn-ocr-review__word.needs-review')
    for (let n = 0; await pending.count(); n++) {
      if (n > 500) throw new Error('bước soát OCR không kết thúc')
      await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
    await page.locator('.erp-flow-result').waitFor({ timeout })
  }
  timing = Date.now() - started
  return { title: await text('.erp-flow-result__title') }
}

const ocrFlow = (slug, names) => async () => {
  await open(slug)
  await add(names)
  const result = await ocrRun()
  return { ...result, file: strip(await download()) }
}

/**
 * Kết quả màn tính tại chỗ không vẽ lại ngay trong cùng nhịp với `fill` — đọc liền là còn số cũ.
 * Chờ tới khi hai lần đọc cách nhau liên tiếp giống hệt và đã có giá trị.
 */
async function settled(read, timeout = 10000) {
  const until = Date.now() + timeout
  let last = await read()
  for (;;) {
    await page.waitForTimeout(250)
    const next = await read()
    if (JSON.stringify(next) === JSON.stringify(last) && next.value !== '—') return next
    if (Date.now() > until) return next
    last = next
  }
}

const flow = (slug, names, before) => async () => {
  await open(slug)
  await add(names)
  if (before) await before()
  const result = await run()
  return { ...result, file: strip(await download()) }
}

/** Công cụ có vùng làm việc thay cho danh sách tệp: `before` tự chờ vùng đó hiện rồi thao tác. */
const staged = (slug, names, before) => async () => {
  await open(slug)
  await add(names, false)
  await before()
  const result = await run()
  return { ...result, file: strip(await download()) }
}

let qrPng = null

/** Mỗi mục: tệp mẫu + tuỳ chọn CỐ ĐỊNH. Đổi tuỳ chọn ở đây = đổi baseline, phải UPDATE=1. */
const TOOLS = {
  'anh-sang-pdf': flow('anh-sang-pdf', ['anh-hien-truong.jpg', 'anh-van-ban.jpg']),
  'ghep-pdf': flow('ghep-pdf', ['hop-dong.pdf', 'phu-luc.pdf']),
  'tach-pdf': flow('tach-pdf', ['hop-dong.pdf'], () => page.getByRole('textbox', { name: 'Khoảng trang' }).fill('1, 2')),
  'nen-pdf': flow('nen-pdf', ['ho-so-scan.pdf']),
  'pdf-sang-word': flow('pdf-sang-word', ['hop-dong.pdf']),
  'pdf-sang-word#excel': flow('pdf-sang-word', ['bang-ke.pdf'], () => page.getByRole('radio', { name: /Excel/ }).check()),
  'pdf-sang-word#jpg': flow('pdf-sang-word', ['hop-dong.pdf'], async () => {
    await page.getByRole('radio', { name: /Ảnh JPG/ }).check()
    await page.getByLabel('Độ phân giải').selectOption('96')
  }),
  'pdf-sang-anh': flow('pdf-sang-anh', ['hop-dong.pdf'], () => page.getByLabel('Độ phân giải').selectOption('96')),
  'sap-xep-pdf': staged('sap-xep-pdf', ['hop-dong.pdf'], async () => {
    await page.locator('.erp-organize__tile').nth(11).waitFor({ timeout: 60000 })
    await page.getByRole('button', { name: 'Dời trang 1 ra sau', exact: true }).click()
    await page.getByRole('button', { name: 'Xoay trang 3 sang phải', exact: true }).click()
    await page.getByRole('button', { name: 'Bỏ trang 12', exact: true }).click()
  }),
  'danh-so-trang': staged('danh-so-trang', ['hop-dong.pdf'], async () => {
    await page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })
    await page.getByLabel('Số bắt đầu').fill('5')
  }),
  'dong-dau-pdf': staged('dong-dau-pdf', ['hop-dong.pdf'], () => page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })),
  'che-thong-tin-pdf': staged('che-thong-tin-pdf', ['hop-dong.pdf'], async () => {
    const layer = page.locator('.erp-redact')
    await layer.waitFor({ timeout: 60000 })
    await layer.scrollIntoViewIfNeeded()
    const box = await layer.boundingBox()
    // Dòng "Gói thầu XL-03 · …" trên trang 1.
    await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.55)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.58, { steps: 4 })
    await page.mouse.move(box.x + box.width * 0.92, box.y + box.height * 0.6, { steps: 4 })
    await page.mouse.up()
  }),
  'ky-tai-lieu': staged('ky-tai-lieu', ['hop-dong.pdf'], async () => {
    await page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })
    const pad = page.locator('.erp-sign-pad')
    await pad.scrollIntoViewIfNeeded()
    const ink = await pad.boundingBox()
    await page.mouse.move(ink.x + ink.width * 0.2, ink.y + ink.height * 0.6)
    await page.mouse.down()
    await page.mouse.move(ink.x + ink.width * 0.5, ink.y + ink.height * 0.3, { steps: 6 })
    await page.mouse.move(ink.x + ink.width * 0.8, ink.y + ink.height * 0.65, { steps: 6 })
    await page.mouse.up()
    const layer = page.locator('.erp-sign')
    await layer.waitFor({ timeout: 30000 })
    await layer.scrollIntoViewIfNeeded()
    const box = await layer.boundingBox()
    await page.mouse.click(box.x + box.width * 0.7, box.y + box.height * 0.8)
  }),
  'so-sanh-tai-lieu': flow('so-sanh-tai-lieu', ['hop-dong.pdf', 'hop-dong-v2.pdf']),
  'ocr-van-ban': ocrFlow('ocr-van-ban', ['anh-van-ban.jpg']),
  'anh-sang-van-ban': ocrFlow('anh-sang-van-ban', ['anh-van-ban.jpg']),
  'chuyen-doi-anh': flow('chuyen-doi-anh', ['anh-hien-truong.jpg'], () => page.getByRole('radio', { name: /^PNG/ }).check()),
  'nen-anh': flow('nen-anh', ['anh-hien-truong.jpg'], async () => {
    await page.getByRole('radio', { name: /^Mạnh/ }).check()
    await page.getByLabel('Cạnh dài tối đa').selectOption('1280')
  }),
  'cat-chinh-anh': async () => {
    await open('cat-chinh-anh')
    await add(['anh-hien-truong.jpg'], false)
    await page.getByRole('button', { name: 'Xoay phải' }).click({ timeout: 60000 })
    const result = await run()
    return { ...result, file: strip(await download()) }
  },
  'anh-hang-loat': flow('anh-hang-loat', ['anh-hien-truong.jpg', 'so-do-trong-suot.png'], async () => {
    await page.getByLabel('Cạnh dài tối đa', { exact: true }).fill('400')
    await page.getByLabel('Định dạng ra').selectOption('jpeg')
    await page.getByLabel('Mẫu tên tệp').fill('cong-trinh-{n}')
  }),
  'che-dong-dau-anh': staged('che-dong-dau-anh', ['anh-hien-truong.jpg'], async () => {
    const frame = page.locator('.erp-mark')
    await frame.waitFor({ timeout: 60000 })
    await frame.scrollIntoViewIfNeeded()
    const box = await frame.boundingBox()
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, { steps: 6 })
    await page.mouse.up()
    await page.getByLabel('Chữ đóng dấu (không bắt buộc)').fill('BẢN NHÁP')
  }),
  'anh-the': staged('anh-the', ['anh-hien-truong.jpg'], async () => {
    await page.locator('.erp-crop').waitFor({ timeout: 60000 })
    await page.getByLabel('Khổ giấy').selectOption('10x15')
  }),
  'do-kich-thuoc-anh': async () => {
    await open('do-kich-thuoc-anh')
    await add(['anh-hien-truong.jpg'], false)
    const frame = page.locator('.erp-measure')
    await frame.waitFor({ timeout: 60000 })
    await page.locator('.erp-measure__image').evaluate((img) => img.decode())
    await frame.scrollIntoViewIfNeeded()
    const box = await frame.boundingBox()
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.3)
    const labels = await page.locator('.erp-measure__label').allInnerTexts()
    const result = await run()
    return { ...result, labels, file: strip(await download()) }
  },
  'xem-pdf': async () => {
    await page.goto(`${HUB}/xem-pdf`)
    await page.locator('input[type=file]').first().setInputFiles([fix('hop-dong.pdf')])
    await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
    await page.waitForTimeout(1500)
    return { pages: await page.locator('.erp-doc-page').count() }
  },
  'chinh-sua-pdf': async () => {
    await page.goto(`${HUB}/chinh-sua-pdf`)
    await page.locator('input[type=file]').first().setInputFiles([fix('hop-dong.pdf'), fix('anh-hien-truong.jpg')])
    await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
    await page.waitForTimeout(1500)
    const pages = await page.locator('.erp-doc-page').count()
    await page.getByRole('tab', { name: 'Xuất tệp' }).click()
    const started = Date.now()
    const file = strip(await download(page.getByRole('button', { name: /Tải PDF/ })))
    timing = Date.now() - started
    return { pages, file }
  },
  'tao-ma-qr': async () => {
    await open('tao-ma-qr', '.erp-qr-preview')
    await field('Nhập nội dung').fill('https://erpcons.vn/golden')
    const file = await download(page.getByRole('button', { name: 'Tải mã QR' }))
    qrPng = file.bytes
    // Lưới màu của mã QR đổi theo từng ô nhỏ — không ổn định để so; nội dung mã do "doc-ma-qr" đọc ngược lại.
    const { grid: _grid, ...signature } = strip(file)
    return { file: signature }
  },
  'doc-ma-qr': async () => {
    if (!qrPng) throw new Error('cần chạy cùng tao-ma-qr (đọc ngược mã vừa tạo)')
    await open('doc-ma-qr')
    await page.locator('.erp-flow-picker input[type=file]').setInputFiles([{ name: 'ma.png', mimeType: 'image/png', buffer: qrPng }])
    await page.locator('.erp-scan-hit').first().waitFor({ timeout: 30000 })
    return { format: await text('.erp-scan-hit__format'), read: await text('.erp-scan-hit') }
  },
  'tinh-toan-nhanh': async () => {
    await open('tinh-toan-nhanh', '.erp-tool-result')
    await field('Chiều dài').fill('12,5')
    await field('Chiều rộng').fill('4')
    await field('Số lượng').fill('3')
    return { value: await text('.erp-tool-result__value'), notes: await page.locator('.erp-tool-result__note').allInnerTexts() }
  },
  'tinh-tien': async () => {
    await open('tinh-tien', '.erp-tool-result')
    const read = async () => ({ value: await text('.erp-tool-result__value'), notes: await page.locator('.erp-tool-result__note').allInnerTexts(), rows: await page.locator('.erp-tool-row').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim())) })
    await page.getByRole('button', { name: 'Thuế & chiết khấu' }).click()
    await field('Giá chưa thuế').fill('150.000')
    await field('Thuế suất').fill('8')
    const vat = await read()
    await page.getByRole('button', { name: 'Lãi gộp' }).click()
    await field('Giá vốn').fill('80.000')
    await field('Giá bán').fill('100.000')
    const margin = await read()
    await page.getByRole('button', { name: 'Chia tiền' }).click()
    await field('Tổng tiền').fill('1.000.000')
    await field('Số người').fill('3')
    return { vat, margin, split: await read() }
  },
  'tinh-ngay': async () => {
    await open('tinh-ngay', '.erp-tool-result')
    const read = async () => ({ value: await text('.erp-tool-result__value'), notes: await page.locator('.erp-tool-result__note').allInnerTexts(), rows: await page.locator('.erp-tool-row').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim())) })
    // Ngày cố định: mặc định của màn là HÔM NAY, không so được giữa hai lần chạy.
    await field('Từ ngày').fill('2026-10-01')
    await field('Đến ngày').fill('2026-10-31')
    const between = await settled(read)
    await page.getByRole('button', { name: 'Cộng / trừ ngày' }).click()
    await field('Ngày bắt đầu').fill('2026-10-02')
    await field('Số ngày').fill('10')
    await field('Loại ngày').selectOption('workday')
    return { between, add: await settled(read) }
  },
  'chuyen-doi-don-vi': async () => {
    await open('chuyen-doi-don-vi', '.erp-tool-rows')
    await field('Giá trị').fill('2,5')
    return { rows: await page.locator('.erp-tool-row').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim())) }
  },
  'dem-ky-tu': async () => {
    await open('dem-ky-tu', '.erp-tool-stats')
    await field('Văn bản cần đếm').fill('Nghiệm thu cốt thép sàn tầng 3.\nKhối lượng: 12,5 tấn — đạt.\n\nGhi chú 👍🏽')
    return { stats: await page.locator('.erp-tool-stat').evaluateAll((items) => Object.fromEntries(items.map((item) => [item.querySelector('dt').firstChild.textContent.trim(), item.querySelector('dd').innerText.trim()]))) }
  },
  'mau-sac': async () => {
    await open('mau-sac', '.erp-color-swatch')
    await field('HEX').fill('#3678d4')
    return { hex: await field('HEX').inputValue(), rgb: await field('RGB').inputValue(), hsl: await field('HSL').inputValue(), contrasts: await page.locator('.erp-color-contrast').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim())) }
  },
  'tao-ma-ngau-nhien': async () => {
    await open('tao-ma-ngau-nhien', '.erp-tool-rows')
    await page.getByRole('button', { name: 'Tạo lại' }).click()
    const codes = await page.locator('.erp-tool-row__code').allInnerTexts()
    // Giá trị vốn ngẫu nhiên: chỉ so HÌNH DẠNG, và hai mã liền nhau không được trùng.
    return { count: codes.length, lengths: [...new Set(codes.map((code) => code.length))], classes: [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].map((pattern) => codes.every((code) => pattern.test(code))), unique: new Set(codes).size === codes.length }
  },
  'ghi-chu-nhanh': async () => {
    await open('ghi-chu-nhanh', '.erp-notes')
    const create = page.locator('.erp-notes__list').getByRole('button', { name: 'Ghi chú mới' })
    if (await create.count()) await create.click()
    await field('Tiêu đề').fill('Việc ở công trường')
    await field('Nội dung').fill('Nghiệm thu cốt thép sàn tầng 3.')
    await page.waitForTimeout(1500)
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('erpcons.tools.notes') ?? 'null'))
    // Bỏ id và mốc giờ: lần nào cũng khác.
    return { version: stored?.version, notes: (stored?.notes ?? []).map((note) => ({ title: note.title, body: note.body, tasks: note.tasks.length, keys: Object.keys(note).sort() })) }
  },
}

// ---------- Chạy ----------

const baseline = fs.existsSync(BASELINE) ? JSON.parse(fs.readFileSync(BASELINE, 'utf8')) : null
const tools = {}
const report = {}

// Chỉ cần một trang cùng origin để giải mã ảnh; không chờ lưới thẻ — trang chọn công cụ hỏng không được kéo golden hỏng theo.
await page.goto(HUB)

for (const [key, drive] of Object.entries(TOOLS)) {
  if (only && !only.includes(key.split('#')[0])) continue
  inputs.length = 0
  timing = null
  outBytes = null
  try {
    const output = await drive()
    const input = {}
    for (const name of [...new Set(inputs)]) input[name] = await fileSig(name, fs.readFileSync(FIX + name))
    tools[key] = { input, output, info: { ms: timing, bytes: outBytes } }
  } catch (error) {
    report[key] = { status: 'failed', detail: [String(error).split('\n')[0].slice(0, 200)] }
    continue
  }

  const expected = baseline?.tools?.[key]
  if (update) report[key] = { status: 'recorded' }
  else if (!expected) report[key] = { status: 'no-baseline' }
  else {
    // Tệp mẫu đã khác thì kết quả khác là đương nhiên — không phải hồi quy của app.
    const inputDrift = diff(expected.input, tools[key].input, 'input')
    if (inputDrift.length > 0) report[key] = { status: 'fixture-changed', detail: inputDrift.slice(0, 5) }
    else {
      const drift = diff(expected.output, tools[key].output, 'output')
      report[key] = drift.length === 0 ? { status: 'match' } : { status: 'MISMATCH', detail: drift.slice(0, 10) }
    }
  }
  report[key].info = tools[key].info
}

const chrome = browser.version()
await browser.close()

if (update) {
  // Chạy riêng (ONLY) thì chỉ ghi đè các mục vừa chạy, giữ phần còn lại.
  const merged = { ...(only ? (baseline?.tools ?? {}) : {}), ...tools }
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true })
  fs.writeFileSync(BASELINE, JSON.stringify({ recorded: new Date().toISOString().slice(0, 10), chrome, tools: merged }, null, 2) + '\n')
}

const by = (status) => Object.entries(report).filter(([, item]) => item.status === status).map(([key]) => key)
const summary = {
  mode: update ? 'update' : 'compare',
  baseline: baseline ? { recorded: baseline.recorded, chrome: baseline.chrome } : null,
  chrome,
  ran: Object.keys(report).length,
  match: by('match').length,
  mismatch: by('MISMATCH'),
  failed: by('failed'),
  fixtureChanged: by('fixture-changed'),
  noBaseline: by('no-baseline'),
  recorded: by('recorded').length,
}

console.log(JSON.stringify({ summary, report, errors }, null, 2))
if (summary.mismatch.length > 0) process.exit(1)
if (summary.failed.length > 0 || summary.fixtureChanged.length > 0 || summary.noBaseline.length > 0) process.exit(2)
