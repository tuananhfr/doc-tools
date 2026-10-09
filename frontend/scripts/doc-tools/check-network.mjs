// Network QA của "Chuyện Nhỏ" (gate G1, v2.0 §1: câu "xử lý trên máy bạn" phải được chứng minh).
// Mỗi công cụ được mở và chạy THẬT với tệp / nội dung mang chuỗi đánh dấu; mọi request của trang
// (kể cả từ worker) được ghi lại rồi soi: có lệnh ghi nào ngoài bộ đếm lượt mở, có request ra
// origin khác, có thân request lớn, có chuỗi đánh dấu / tên tệp lọt vào URL hay thân request không.
// Script chỉ báo, không tự đánh trượt — đọc `summary` rồi tới `tools.<slug>.flags`.
// ONLY=ghep-pdf,tao-ma-qr để chạy riêng. SELFTEST=1: sau mỗi công cụ tự bắn một request mang chuỗi
// đánh dấu và một request ra origin khác — mọi công cụ PHẢI bị gắn cờ, không thì bộ soi đang mù.
import fs from 'node:fs'
import { chromium, FIX, HUB, ORIGIN, outDir } from './lib/qa.mjs'

const OUT = outDir('network')
const only = process.env.ONLY ? process.env.ONLY.split(',') : null

/** Có trong mọi tên tệp và mọi nội dung gõ vào: thấy nó trên đường truyền là nội dung đã rời máy. */
const MARKER = 'NETQA7731'
/** Thân request hợp lệ duy nhất là `{"tool":"<slug>"}` của bộ đếm — lớn hơn thế này là đáng soi. */
const BODY_LIMIT = 200

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true })
const page = await context.newPage()
page.on('dialog', (dialog) => void dialog.accept())
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 200)))

let log = []
let sockets = []
context.on('request', (request) => {
  const body = request.postDataBuffer()
  log.push({ method: request.method(), url: request.url(), type: request.resourceType(), body })
})
page.on('websocket', (socket) => sockets.push(socket.url()))

const local = (url) => url.startsWith('blob:') || url.startsWith('data:')
const sameOrigin = (url) => local(url) || new URL(url).origin === ORIGIN
const pathOf = (url) => (local(url) ? url.slice(0, 5) : new URL(url).pathname)
const leaks = (text) => text.includes(MARKER) || decodeURIComponent(text.replace(/%(?![0-9a-f]{2})/gi, '%25')).includes(MARKER)
const isVisit = (entry) => entry.method === 'POST' && pathOf(entry.url).endsWith('/tools/visits')

function summarize(slug) {
  const writes = log.filter((entry) => entry.method !== 'GET' && entry.method !== 'HEAD' && entry.method !== 'OPTIONS')
  const flags = {
    // Lệnh ghi ngoài bộ đếm lượt mở.
    unexpectedWrites: writes.filter((entry) => !isVisit(entry)).map((entry) => `${entry.method} ${pathOf(entry.url)} (${entry.body?.length ?? 0} B)`),
    crossOrigin: [...new Set(log.filter((entry) => !sameOrigin(entry.url)).map((entry) => new URL(entry.url).origin))],
    largeBodies: log.filter((entry) => (entry.body?.length ?? 0) > BODY_LIMIT).map((entry) => `${entry.method} ${pathOf(entry.url)} (${entry.body.length} B)`),
    markerInUrl: log.filter((entry) => !local(entry.url) && leaks(entry.url)).map((entry) => pathOf(entry.url)),
    markerInBody: log.filter((entry) => entry.body && leaks(entry.body.toString('latin1'))).map((entry) => pathOf(entry.url)),
    // Dev có websocket HMR của Vite (cùng origin); bản production không được có socket nào.
    foreignSockets: sockets.filter((url) => new URL(url).host !== new URL(ORIGIN).host),
  }
  const visit = writes.filter(isVisit).map((entry) => entry.body?.toString('utf8') ?? '')
  // `/api/v1/`: dev còn phục vụ mã nguồn ở `/src/api/*.ts`, không phải lệnh gọi API.
  const api = [...new Set(log.filter((entry) => pathOf(entry.url).includes('/api/v1/')).map((entry) => `${entry.method} ${pathOf(entry.url)}`))]
  // Tài nguyên nặng nạp lười (worker, wasm, dữ liệu OCR): có mặt ở đây = sổ ghi thấy cả request của worker.
  const lazyAssets = [...new Set(log.map((entry) => pathOf(entry.url)).filter((path) => /\.wasm|traineddata|worker/i.test(path)).map((path) => path.split('/').pop().split('?')[0]))]
  return { requests: log.length, api, lazyAssets, visit, visitOnlySlug: visit.every((body) => body === JSON.stringify({ tool: slug })), sockets: sockets.length, flags, clean: Object.values(flags).every((list) => list.length === 0) }
}

// ---------- Tệp mẫu (tên mang chuỗi đánh dấu) ----------

const fixture = (source, name, mimeType) => ({ name: `${MARKER}-${name}`, mimeType, buffer: fs.readFileSync(FIX + source) })
const pdfA = fixture('hop-dong.pdf', 'hop-dong.pdf', 'application/pdf')
const pdfB = fixture('phu-luc.pdf', 'phu-luc.pdf', 'application/pdf')
const scan = fixture('anh-van-ban.jpg', 'van-ban.jpg', 'image/jpeg')
const photo = fixture('anh-hien-truong.jpg', 'hien-truong.jpg', 'image/jpeg')

// ---------- Thao tác chung ----------

const field = (label) => page.getByLabel(label, { exact: true })

async function open(slug, ready = '.erp-flow-picker') {
  await page.goto(`${HUB}/${slug}`)
  await page.locator(ready).first().waitFor({ timeout: 30000 })
}

async function add(list, listed = true) {
  await page.locator('.erp-flow-picker input[type=file]').setInputFiles(list)
  if (listed) await page.locator('.erp-flow-file').nth(list.length - 1).waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
}

async function run(timeout = 180000) {
  await page.locator('.erp-flow__run').click()
  await page.locator('.erp-flow-result').waitFor({ timeout })
}

/** OCR v2 dừng ở bước soát chữ: xác nhận nguyên giá trị máy đọc rồi xuất — soát cũng phải không gửi gì ra ngoài. */
async function ocrRun(timeout = 180000) {
  await page.locator('.erp-flow__run').click()
  await page.locator('.cn-ocr-review, .erp-flow-result').first().waitFor({ timeout })
  if (await page.locator('.cn-ocr-review').count()) {
    for (let n = 0; await page.locator('.cn-ocr-review__word.needs-review').count(); n++) {
      if (n > 500) throw new Error('bước soát OCR không kết thúc')
      await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
    await page.locator('.erp-flow-result').waitFor({ timeout })
  }
}

const ocrFlow = (slug, files) => async () => {
  await open(slug)
  await add(files)
  await ocrRun()
  await download()
}

async function download(button = page.getByRole('button', { name: 'Tải về' })) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), button.click()])
  const path = OUT + dl.suggestedFilename()
  await dl.saveAs(path)
  return path
}

const flow = (slug, files, before) => async () => {
  await open(slug)
  await add(files)
  if (before) await before()
  await run()
  await download()
}

/** Công cụ có vùng làm việc thay cho danh sách tệp: `before` tự chờ vùng đó hiện rồi thao tác. */
const staged = (slug, files, before) => async () => {
  await open(slug)
  await add(files, false)
  await before()
  await run()
  await download()
}

let qrPng = null

/** Mỗi công cụ: mở, đưa tệp / nội dung vào, chạy tới khi có kết quả, tải về nếu có. */
const TOOLS = {
  'anh-sang-pdf': flow('anh-sang-pdf', [photo, scan]),
  'ghep-pdf': flow('ghep-pdf', [pdfA, pdfB]),
  'tach-pdf': flow('tach-pdf', [pdfA], () => page.getByRole('textbox', { name: 'Khoảng trang' }).fill('1')),
  'nen-pdf': flow('nen-pdf', [pdfA]),
  'pdf-sang-word': flow('pdf-sang-word', [pdfA]),
  'pdf-sang-anh': flow('pdf-sang-anh', [pdfA], () => page.getByLabel('Độ phân giải').selectOption('96')),
  'sap-xep-pdf': staged('sap-xep-pdf', [pdfA], async () => {
    await page.locator('.erp-organize__tile').nth(11).waitFor({ timeout: 60000 })
    await page.getByRole('button', { name: 'Xoay trang 3 sang phải', exact: true }).click()
  }),
  'danh-so-trang': staged('danh-so-trang', [pdfA], () => page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })),
  // Chữ đánh dấu đi vào dấu: nội dung người dùng gõ cũng không được rời máy.
  'dong-dau-pdf': staged('dong-dau-pdf', [pdfA], async () => {
    await page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })
    await page.getByLabel('Nội dung').fill(MARKER)
  }),
  'che-thong-tin-pdf': staged('che-thong-tin-pdf', [pdfA], async () => {
    const layer = page.locator('.erp-redact')
    await layer.waitFor({ timeout: 60000 })
    await layer.scrollIntoViewIfNeeded()
    const box = await layer.boundingBox()
    await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.55)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.6, { steps: 6 })
    await page.mouse.up()
  }),
  'ky-tai-lieu': async () => {
    await open('ky-tai-lieu')
    await add([pdfA], false)
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
    await run()
    await download()
  },
  'so-sanh-tai-lieu': flow('so-sanh-tai-lieu', [pdfA, pdfB]),
  'ocr-van-ban': ocrFlow('ocr-van-ban', [scan]),
  'anh-sang-van-ban': ocrFlow('anh-sang-van-ban', [scan]),
  'chuyen-doi-anh': flow('chuyen-doi-anh', [photo], () => page.getByRole('radio', { name: /^PNG/ }).check()),
  'nen-anh': flow('nen-anh', [photo], () => page.getByRole('radio', { name: /^Mạnh/ }).check()),
  'xem-pdf': async () => {
    await page.goto(`${HUB}/xem-pdf`)
    await page.locator('input[type=file]').first().setInputFiles([pdfA])
    await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
    await page.waitForTimeout(1500)
  },
  'chinh-sua-pdf': async () => {
    await page.goto(`${HUB}/chinh-sua-pdf`)
    await page.locator('input[type=file]').first().setInputFiles([pdfA, photo])
    await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
    await page.getByRole('tab', { name: 'Xuất tệp' }).click()
    await download(page.getByRole('button', { name: /Tải PDF/ }))
  },
  'cat-chinh-anh': async () => {
    await open('cat-chinh-anh')
    await add([photo], false)
    await page.getByRole('button', { name: 'Xoay phải' }).click({ timeout: 60000 })
    await run()
    await download()
  },
  'anh-hang-loat': async () => {
    await open('anh-hang-loat')
    await add([photo])
    await page.getByLabel('Mẫu tên tệp').fill(`${MARKER}-{n}`)
    await run()
    await download()
  },
  'che-dong-dau-anh': async () => {
    await open('che-dong-dau-anh')
    await add([photo], false)
    const frame = page.locator('.erp-mark')
    await frame.waitFor({ timeout: 60000 })
    await frame.scrollIntoViewIfNeeded()
    const box = await frame.boundingBox()
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.1)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.3, { steps: 6 })
    await page.mouse.up()
    await page.getByLabel('Chữ đóng dấu (không bắt buộc)').fill(MARKER)
    await run()
    await download()
  },
  'anh-the': async () => {
    await open('anh-the')
    await add([photo], false)
    await page.locator('.erp-crop').waitFor({ timeout: 60000 })
    await run()
    await download()
  },
  'do-kich-thuoc-anh': async () => {
    await open('do-kich-thuoc-anh')
    await add([photo], false)
    const frame = page.locator('.erp-measure')
    await frame.waitFor({ timeout: 60000 })
    await frame.scrollIntoViewIfNeeded()
    const box = await frame.boundingBox()
    await page.mouse.click(box.x + box.width * 0.2, box.y + box.height * 0.3)
    await page.mouse.click(box.x + box.width * 0.6, box.y + box.height * 0.3)
    await run()
    await download()
  },
  'tao-ma-qr': async () => {
    await open('tao-ma-qr', '.erp-qr-preview')
    await field('Nhập nội dung').fill(`https://example.test/${MARKER}`)
    qrPng = await download(page.getByRole('button', { name: 'Tải mã QR' }))
  },
  'doc-ma-qr': async () => {
    await open('doc-ma-qr')
    // Mã vừa tạo ở bước trên (mang chuỗi đánh dấu trong nội dung); chạy riêng thì dùng ảnh chụp.
    const item = qrPng ? { name: `${MARKER}-ma.png`, mimeType: 'image/png', buffer: fs.readFileSync(qrPng) } : photo
    await page.locator('.erp-flow-picker input[type=file]').setInputFiles([item])
    await page.waitForTimeout(4000)
  },
  'tinh-toan-nhanh': async () => {
    await open('tinh-toan-nhanh', '.erp-tool-result')
    await field('Chiều dài').fill('12,5')
    await field('Chiều rộng').fill('4')
  },
  'tinh-tien': async () => {
    await open('tinh-tien', '.erp-tool-result')
    await field('Tỷ lệ').fill('8')
    await field('Của số').fill('1.500.000')
  },
  'tinh-ngay': async () => {
    await open('tinh-ngay', '.erp-tool-result')
    await field('Từ ngày').fill('2026-10-01')
    await field('Đến ngày').fill('2026-10-31')
  },
  'chuyen-doi-don-vi': async () => {
    await open('chuyen-doi-don-vi', '.erp-tool-rows')
    await field('Giá trị').fill('2,5')
  },
  'dem-ky-tu': async () => {
    await open('dem-ky-tu', '.erp-tool-stats')
    await field('Văn bản cần đếm').fill(`${MARKER} hợp đồng số 12 — giá trị 3 tỷ`)
  },
  'mau-sac': async () => {
    await open('mau-sac', '.erp-color-swatch')
    await field('HEX').fill('#3678d4')
  },
  'tao-ma-ngau-nhien': async () => {
    await open('tao-ma-ngau-nhien', '.erp-tool-rows')
    await page.getByRole('button', { name: 'Tạo lại' }).click()
  },
  'ghi-chu-nhanh': async () => {
    await open('ghi-chu-nhanh', '.erp-notes')
    const create = page.locator('.erp-notes__list').getByRole('button', { name: 'Ghi chú mới' })
    if (await create.count()) await create.click()
    await field('Tiêu đề').fill(`${MARKER} việc riêng`)
    await field('Nội dung').fill(`${MARKER} mật khẩu két: 4471`)
    await page.waitForTimeout(1500)
  },
}

const tools = {}
for (const [slug, drive] of Object.entries(TOOLS)) {
  if (only && !only.includes(slug)) continue
  log = []
  sockets = []
  let failure = null
  try {
    await drive()
  } catch (error) {
    failure = String(error).split('\n')[0].slice(0, 200)
  }
  if (process.env.SELFTEST === '1') {
    await page.evaluate((marker) => {
      void fetch('/qa-selftest', { method: 'POST', body: `${marker} ${'x'.repeat(400)}` }).catch(() => undefined)
      void fetch(`https://qa-selftest.invalid/?name=${marker}`).catch(() => undefined)
    }, MARKER)
  }
  // Request gửi trễ (beacon, đếm lượt) phải kịp vào sổ trước khi chốt.
  await page.waitForTimeout(1500)
  tools[slug] = { ran: !failure, ...(failure ? { failure } : {}), ...summarize(slug) }
}

const list = Object.entries(tools)
const summary = {
  origin: ORIGIN,
  tools: list.length,
  ran: list.filter(([, tool]) => tool.ran).length,
  clean: list.filter(([, tool]) => tool.ran && tool.clean).length,
  notRun: list.filter(([, tool]) => !tool.ran).map(([slug]) => slug),
  flagged: list.filter(([, tool]) => !tool.clean).map(([slug]) => slug),
  apiCalls: [...new Set(list.flatMap(([, tool]) => tool.api))].sort(),
}

console.log(JSON.stringify({ summary, tools, errors }, null, 2))
await browser.close()
