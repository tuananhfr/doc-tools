// Tiện ích không nhận tệp của "Chuyện Nhỏ": tạo / đọc mã QR, tính toán nhanh, đổi đơn vị, đếm ký tự,
// màu sắc, mã ngẫu nhiên, ghi chú nhanh.
// Mã QR đi MỘT VÒNG: tạo ở màn "Tạo QR" -> tải PNG về -> đưa vào màn "Đọc QR" (zxing) đọc lại; mã vạch
// EAN-13 vẽ bằng canvas ngay trong trang. Camera đọc một tệp .y4m dựng từ chính mã QR vừa tải
// (`--use-file-for-fake-video-capture`), nên phải mở trình duyệt thứ hai.
//
//   ONLY=qr-create,qr-read,camera,calc,unit,count,color,random,note   chạy riêng từng phần
import fs from 'node:fs'
import { chromium, outDir, HUB, APP_HUB, mockSession } from './lib/qa.mjs'

const OUT = outDir('utility-tools')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const want = (name) => !only || only.includes(name)

/** Phần đang chạy — gắn vào từng lỗi console để biết lỗi của màn nào. */
let stage = 'init'
const contextOptions = { viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true, permissions: ['camera', 'clipboard-read', 'clipboard-write'] }
const errors = []

async function start(args = []) {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-ui-for-media-stream', ...args] })
  const context = await browser.newContext(contextOptions)
  // Ghi lại mọi luồng camera đã mở để kiểm chúng có được TẮT khi rời màn.
  await context.addInitScript(() => {
    window.__streams = []
    const original = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices)
    if (original) {
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const stream = await original(constraints)
        window.__streams.push(stream)
        return stream
      }
    }
  })
  const page = await context.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`${stage}: ${m.text().slice(0, 200)} @ ${m.location().url.slice(-80)}`))
  page.on('pageerror', (e) => errors.push(`${stage}: ${String(e)}`))
  page.on('dialog', (dialog) => void dialog.accept())
  return { browser, context, page }
}

let { browser, context, page } = await start()
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, fullPage: true })
const out = { theme, vw }

const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
// Windows trả xuống dòng của clipboard về dạng \r\n.
const clipboard = async () => (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')
const field = (label) => page.getByLabel(label, { exact: true })
const texts = (selector) => page.locator(selector).allInnerTexts()
const text = async (selector) => ((await page.locator(selector).count()) ? (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ').trim() : null)

async function setTheme() {
  await page.evaluate((t) => {
    const raw = localStorage.getItem('erpcons.app')
    const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    data.state.theme = t
    localStorage.setItem('erpcons.app', JSON.stringify(data))
  }, theme)
}

async function open(slug, ready) {
  stage = slug
  await page.goto(`${HUB}/${slug}`)
  await setTheme()
  await page.reload()
  await page.locator(ready).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(400)
  return { title: await page.title(), heading: await text('.erp-tool-crumb__title'), privacy: await text('.erp-tool-crumb__privacy') }
}

async function download(button) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), button.click()])
  const path = `${OUT}${theme}-${vw}-${dl.suggestedFilename()}`
  await dl.saveAs(path)
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) }
}

const file = (name, mimeType, buffer) => ({ name, mimeType, buffer })

/** Kích thước của một ảnh + màu tại các điểm `[x, y]` (điểm ảnh). */
async function inspect(bytes, points = []) {
  return page.evaluate(
    async ({ base64, points }) => {
      const data = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
      const bitmap = await createImageBitmap(new Blob([data]))
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const c = canvas.getContext('2d')
      c.drawImage(bitmap, 0, 0)
      return { width: bitmap.width, height: bitmap.height, pixels: points.map(([x, y]) => Array.from(c.getImageData(x, y, 1, 1).data)) }
    },
    { base64: bytes.toString('base64'), points },
  )
}

/**
 * Vẽ một ảnh mẫu trong trang rồi trả về Buffer. `kind`:
 *  - barcode: `extra` = dãy vạch ('1' = đen), mỗi vạch 4 px;
 *  - photo:   ảnh "chụp xa" nền xám, mã (`extra` = PNG base64) nhỏ và lệch một góc;
 *  - blank:   không có mã nào.
 */
async function drawImage(kind, width, height, type, extra = null) {
  const base64 = await page.evaluate(
    async ({ kind, width, height, type, extra }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const c = canvas.getContext('2d')
      c.fillStyle = '#fff'
      c.fillRect(0, 0, width, height)
      const code = async () => createImageBitmap(new Blob([Uint8Array.from(atob(extra), (char) => char.charCodeAt(0))]))
      if (kind === 'barcode') {
        c.fillStyle = '#000'
        Array.from(extra).forEach((bit, index) => bit === '1' && c.fillRect(44 + index * 4, 20, 4, height - 40))
      } else if (kind === 'photo') {
        c.fillStyle = '#c9d2d9'
        c.fillRect(0, 0, width, height)
        c.drawImage(await code(), width * 0.63, height * 0.55, 620, 620)
      } else {
        c.fillStyle = '#8899aa'
        c.fillRect(width / 6, height / 4, (width * 2) / 3, height / 2)
      }
      const blob = await new Promise((done) => canvas.toBlob(done, type, 0.92))
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(binary)
    },
    { kind, width, height, type, extra },
  )
  return Buffer.from(base64, 'base64')
}

/** Mặt phẳng độ sáng (Y) của một khung hình camera nền trắng có mã ở giữa — để dựng tệp .y4m. */
async function lumaFrame(width, height, codeBase64) {
  const base64 = await page.evaluate(
    async ({ width, height, codeBase64 }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const c = canvas.getContext('2d')
      c.fillStyle = '#fff'
      c.fillRect(0, 0, width, height)
      const bitmap = await createImageBitmap(new Blob([Uint8Array.from(atob(codeBase64), (char) => char.charCodeAt(0))]))
      c.drawImage(bitmap, (width - 360) / 2, (height - 360) / 2, 360, 360)
      const rgba = c.getImageData(0, 0, width, height).data
      const luma = new Uint8Array(width * height)
      for (let i = 0; i < luma.length; i++) luma[i] = Math.round(0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2])
      let binary = ''
      for (let i = 0; i < luma.length; i += 0x8000) binary += String.fromCharCode(...luma.subarray(i, i + 0x8000))
      return btoa(binary)
    },
    { width, height, codeBase64 },
  )
  return Buffer.from(base64, 'base64')
}

/** Thanh trượt: đặt giá trị qua setter gốc để React nhận ra thay đổi. */
const setRange = (value) =>
  page.locator('input[type=range]').evaluate((el, next) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, next)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }, String(value))

/** Dãy vạch của một mã EAN-13 (95 ô, '1' = vạch đen). */
function ean13(digits12) {
  const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011']
  const R = L.map((code) => Array.from(code, (bit) => (bit === '1' ? '0' : '1')).join(''))
  const G = R.map((code) => Array.from(code).reverse().join(''))
  const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL']
  const numbers = Array.from(digits12, Number)
  const sum = numbers.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0)
  const code = [...numbers, (10 - (sum % 10)) % 10]
  const parity = PARITY[code[0]]
  const left = code.slice(1, 7).map((digit, index) => (parity[index] === 'L' ? L[digit] : G[digit])).join('')
  const right = code.slice(7).map((digit) => R[digit]).join('')
  return { text: code.join(''), bits: `101${left}01010${right}101` }
}

const QR_URL = 'https://erpcons.vn'
const qrFiles = []
let wifiPng = null

// ---------- 1. Tạo mã QR ----------
if (want('qr-create') || want('qr-read') || want('camera')) {
  const o = (out.qrCreate = await open('tao-ma-qr', '.erp-qr-preview'))
  const png = page.getByRole('button', { name: 'Tải mã QR' })
  o.empty = { placeholder: await text('.erp-qr-preview__hint'), pngDisabled: await png.isDisabled(), svgDisabled: await page.getByRole('button', { name: 'Tải bản SVG để in' }).isDisabled() }
  o.tabs = { labels: await texts('.erp-tool-tab'), current: await text('.erp-tool-tab[aria-current=page]') }
  o.kinds = await page.locator('select').first().locator('option').allInnerTexts()
  await shot('qr-create-empty')

  // Thiếu https:// thì tự thêm; chuỗi trong mã được in ra nguyên văn.
  await field('Nhập nội dung').fill('erpcons.vn')
  await page.locator('.erp-qr-preview__code').waitFor()
  o.url = { payload: await text('.erp-qr-payload'), modules: await page.locator('.erp-qr-preview__code').getAttribute('viewBox') }
  await page.locator('.erp-qr-payload + .erp-tool-copy').click()
  o.url.copied = await clipboard()
  o.url.copyLabel = await text('.erp-qr-payload + .erp-tool-copy')

  // Mỗi màu: bấm ô màu -> tải PNG -> soi chữ ký, kích thước, màu của ô định vị và nền.
  const swatches = page.locator('.erp-qr-color')
  o.colors = []
  for (let index = 0; index < (await swatches.count()); index++) {
    await swatches.nth(index).click()
    const label = await swatches.nth(index).getAttribute('title')
    const fill = await page.locator('.erp-qr-preview__code path').getAttribute('fill')
    const saved = await download(png)
    const span = Number((await page.locator('.erp-qr-preview__code').getAttribute('viewBox')).split(' ')[2])
    const meta = await inspect(saved.bytes, [[2, 2]])
    const cell = meta.width / span
    // Ô định vị trên-trái bắt đầu sau vùng trắng 4 ô: tâm ô đầu tiên của nó phải mang màu đã chọn.
    const dark = (await inspect(saved.bytes, [[Math.floor(4.5 * cell), Math.floor(4.5 * cell)]])).pixels[0]
    const hex = `#${dark.slice(0, 3).map((value) => value.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
    o.colors.push({ label, fill, name: saved.name, png: saved.bytes.subarray(1, 4).toString('latin1') === 'PNG', size: `${meta.width}x${meta.height}`, cell, background: meta.pixels[0].join(','), dark: hex, match: hex === fill.toUpperCase() })
    qrFiles.push(file(`qr-${index}-${label}.png`, 'image/png', saved.bytes))
  }
  o.checked = await page.locator('.erp-qr-color input:checked').count()
  await shot('qr-create-url')

  const svg = await download(page.getByRole('button', { name: 'Tải bản SVG để in' }))
  const svgText = svg.bytes.toString('utf8')
  o.svg = { name: svg.name, starts: svgText.slice(0, 40), hasPath: /<path d="M\d/.test(svgText), white: svgText.includes('fill="#FFFFFF"'), bytes: svg.bytes.length }
  o.nudge = await text('.erp-doc-nudge__text')

  // Đường dẫn có khoảng trắng: báo lỗi ngay tại ô, khoá nút tải.
  await field('Nhập nội dung').fill('erpcons vn')
  o.urlError = { message: await text('.erp-tool-form__error'), invalid: await field('Nhập nội dung').evaluate((el) => el.classList.contains('is-invalid')), pngDisabled: await png.isDisabled(), placeholder: await text('.erp-qr-preview__hint') }

  // Wi-Fi: mật khẩu ngắn bị chặn, đủ dài thì ra chuỗi WIFI: có thoát ký tự.
  await field('Loại mã').selectOption('wifi')
  o.wifiEmpty = { error: await text('.erp-tool-form__error'), pngDisabled: await png.isDisabled() }
  await field('Tên mạng Wi-Fi').fill('BCH;Tang 2')
  await field('Mật khẩu').fill('1234567')
  o.wifiShort = await text('.erp-tool-form__error')
  await field('Mật khẩu').fill('thep:D16,2026')
  o.wifi = { payload: await text('.erp-qr-payload'), error: await text('.erp-tool-form__error') }
  const wifi = await download(png)
  o.wifi.name = wifi.name
  wifiPng = file('wifi.png', 'image/png', wifi.bytes)
  await shot('qr-create-wifi')
  await field('Bảo mật').selectOption('nopass')
  o.wifiOpen = { payload: await text('.erp-qr-payload'), passwordField: await field('Mật khẩu').count() }

  // Đổi loại không xoá thứ đã gõ ở loại khác.
  await field('Loại mã').selectOption('phone')
  await field('Số điện thoại').fill('0912 345 678')
  o.phone = await text('.erp-qr-payload')
  await field('Loại mã').selectOption('email')
  await field('Địa chỉ email').fill('ketoan@lpc')
  o.emailError = await text('.erp-tool-form__error')
  await field('Địa chỉ email').fill('ketoan@lpc.vn')
  await field('Tiêu đề thư (không bắt buộc)').fill('Báo giá')
  o.email = await text('.erp-qr-payload')
  await field('Loại mã').selectOption('wifi')
  o.keptSsid = await field('Tên mạng Wi-Fi').inputValue()

  // Dài quá sức chứa của một mã.
  await field('Loại mã').selectOption('text')
  await field('Nhập nội dung').fill('a'.repeat(3000))
  o.tooLong = { message: await text('.erp-tool-form__error'), pngDisabled: await png.isDisabled() }
  await field('Nhập nội dung').fill('Kho B — kệ 12, tầng 3\nThép D16: 240 cây')
  o.text = { payload: await page.locator('.erp-qr-payload').innerText(), modules: await page.locator('.erp-qr-preview__code').getAttribute('viewBox') }
  const multi = await download(png)
  o.text.name = multi.name
  qrFiles.push(file('van-ban.png', 'image/png', multi.bytes))
  o.overflow = await overflow()

  // Thẻ "Quét mã" là link sang công cụ kia.
  await page.locator('.erp-tool-tab', { hasText: 'Quét mã' }).click()
  await page.locator('.erp-flow-picker').waitFor()
  o.tabGoes = new URL(page.url()).pathname
}

// ---------- 2. Đọc mã QR / mã vạch từ ảnh ----------
if (want('qr-read')) {
  const o = (out.qrRead = await open('doc-ma-qr', '.erp-flow-picker'))
  o.empty = { picker: await text('.erp-flow-picker__title'), hint: await text('.erp-flow-picker__hint'), side: await text('.erp-flow__side .erp-flow-field__hint'), buttons: await texts('.erp-flow-picker__actions .btn') }
  await shot('qr-read-empty')

  const barcode = ean13('893456789012')
  const barcodePng = await drawImage('barcode', 95 * 4 + 88, 240, 'image/png', barcode.bits)
  // Ảnh điện thoại: mã nhỏ, nằm lệch một góc của khung hình 3000 px.
  const photo = await drawImage('photo', 3000, 2000, 'image/jpeg', qrFiles[0].buffer.toString('base64'))
  const blank = await drawImage('blank', 600, 400, 'image/png')
  const input = page.locator('.erp-flow-picker input[type=file]')

  // Sáu màu mang CÙNG nội dung nên đọc chung sẽ gộp thành một dòng: đọc từng tệp để biết màu nào cũng quét được.
  o.perColor = []
  for (const item of qrFiles.slice(0, -1)) {
    await input.setInputFiles([item])
    const read = await page
      .locator('.erp-scan-hit__text')
      .first()
      .waitFor({ timeout: 30000 })
      .then(() => text('.erp-scan-hit__text'))
      .catch(() => null)
    o.perColor.push({ file: item.name, read })
    if (read) await page.getByRole('button', { name: 'Xoá hết' }).click()
    else await page.locator('.erp-flow-rejected__close').click()
  }

  await input.setInputFiles([qrFiles[0], qrFiles.at(-1), wifiPng, file('ma-vach.png', 'image/png', barcodePng), file('anh-chup-xa.jpg', 'image/jpeg', photo), file('khong-co-ma.png', 'image/png', blank), file('gia-mao.png', 'image/png', Buffer.from('không phải ảnh'))])
  await page.locator('.erp-flow-rejected').waitFor({ timeout: 60000 })
  await page.waitForTimeout(300)
  const hits = page.locator('.erp-scan-hit')
  o.count = await hits.count()
  o.sideHeading = await text('.erp-tool-side-head .erp-flow-options__title')
  o.hits = await hits.evaluateAll((items) =>
    items.map((item) => ({
      format: item.querySelector('.erp-scan-hit__format').innerText.trim(),
      text: (item.querySelector('.erp-scan-hit__text') ?? item.querySelector('.erp-scan-hit__fields')).innerText.replace(/\s*\n\s*/g, ' | '),
      actions: Array.from(item.querySelectorAll('.erp-scan-hit__actions .btn'), (button) => button.innerText.trim()),
    })),
  )
  o.barcodeExpected = barcode.text
  o.misses = await texts('.erp-flow-rejected__list li')
  o.missTitle = await text('.erp-flow-rejected__title')
  const link = page.locator('.erp-scan-hit__actions a').first()
  o.link = { href: await link.getAttribute('href'), target: await link.getAttribute('target'), rel: await link.getAttribute('rel'), label: (await link.innerText()).trim() }
  o.compactPicker = await page.locator('.erp-flow-picker--compact').count()
  await shot('qr-read-results')

  // Chép nguyên văn + chép mật khẩu Wi-Fi.
  const wifiHit = hits.filter({ hasText: 'Tên mạng' })
  await wifiHit.getByRole('button', { name: 'Chép mật khẩu' }).click()
  o.copiedPassword = await clipboard()
  await wifiHit.getByRole('button', { name: 'Chép nguyên văn' }).click()
  o.copiedRaw = await clipboard()

  // Ảnh đã đọc rồi đưa vào lần nữa: không thêm dòng trùng, chỉ lên đầu.
  await page.locator('.erp-flow-rejected__close').click()
  await input.setInputFiles([wifiPng])
  await page.waitForFunction(() => document.querySelector('.erp-scan-hit')?.querySelector('.erp-scan-hit__fields'), null, { timeout: 30000 })
  o.afterRepeat = { count: await hits.count(), first: await text('.erp-scan-hit .erp-scan-hit__format'), misses: await page.locator('.erp-flow-rejected').count() }

  // Dán ảnh (Ctrl+V).
  await page.getByRole('button', { name: 'Xoá hết' }).click()
  o.afterClear = { count: await hits.count(), picker: await page.locator('.erp-flow-picker--compact').count() }
  await page.evaluate(async (base64) => {
    const data = new DataTransfer()
    data.items.add(new File([Uint8Array.from(atob(base64), (ch) => ch.charCodeAt(0))], '', { type: 'image/png' }))
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }))
  }, qrFiles[0].buffer.toString('base64'))
  await hits.first().waitFor({ timeout: 30000 })
  o.pasted = { count: await hits.count(), text: await text('.erp-scan-hit__text') }

  // Bỏ một kết quả.
  await hits.first().getByRole('button', { name: 'Bỏ kết quả này' }).click()
  o.afterRemove = await hits.count()
  o.overflow = await overflow()
}

// ---------- 3. Tính toán nhanh ----------
if (want('calc')) {
  const o = (out.calc = await open('tinh-toan-nhanh', '.erp-tool-result'))
  const value = () => text('.erp-tool-result__value')
  const notes = () => texts('.erp-tool-result__note')
  o.empty = { value: await value(), notes: await notes(), groups: await texts('.erp-tool-tab'), shapes: await page.locator('select').first().locator('option').allInnerTexts() }
  await shot('calc-empty')

  await field('Chiều dài').fill('12,5')
  await field('Chiều rộng').fill('4')
  o.rectangle = { value: await value(), notes: await notes() }
  await field('Số lượng').fill('3')
  o.rectangleX3 = { value: await value(), notes: await notes() }
  await page.getByRole('button', { name: 'Chép kết quả' }).click()
  o.copied = await clipboard()
  // "1.500" = một phẩy năm: phép tính in lại con số đã hiểu.
  await field('Chiều dài').fill('1.500')
  o.lonePoint = { value: await value(), notes: await notes() }
  await field('Chiều rộng').fill('bốn')
  o.invalid = { value: await value(), notes: await notes(), marked: await field('Chiều rộng').evaluate((el) => el.classList.contains('is-invalid')) }
  await field('Chiều rộng').fill('4')
  await field('Số lượng').fill('')

  await field('Hình').selectOption('trapezoid')
  await field('Đáy lớn').fill('8')
  await field('Đáy nhỏ').fill('4')
  await field('Chiều cao').fill('2,5')
  o.trapezoid = { value: await value(), notes: await notes() }
  await field('Hình').selectOption('circle')
  await field('Đường kính').fill('2')
  o.circle = { value: await value(), notes: await notes() }
  // Quay lại hình chữ nhật: số đã gõ còn nguyên.
  await field('Hình').selectOption('rectangle')
  o.kept = { length: await field('Chiều dài').inputValue(), value: await value() }

  await page.locator('.erp-tool-tab', { hasText: 'Thể tích' }).click()
  await field('Chiều dài').fill('6')
  await field('Chiều rộng').fill('0,3')
  await field('Chiều cao / dày').fill('0,5')
  o.box = { value: await value(), notes: await notes(), label: await text('.erp-tool-result__label') }

  await page.locator('.erp-tool-tab', { hasText: 'Khối lượng' }).click()
  o.massOptions = await page.locator('select').first().locator('option').allInnerTexts()
  await field('Đường kính').fill('16')
  await field('Chiều dài').fill('11,7')
  await field('Số lượng').fill('240')
  o.rebar = { value: await value(), notes: await notes(), units: await texts('.input-group-text') }
  await shot('calc-rebar')
  await field('Số lượng').fill('')
  await field('Vật liệu / cách tính').selectOption('density')
  await field('Thể tích').fill('2')
  await page.getByRole('button', { name: 'Bê tông cốt thép' }).click()
  o.density = { preset: await field('Khối lượng riêng').inputValue(), value: await value(), notes: await notes() }
  o.overflow = await overflow()
}

// ---------- 4. Chuyển đổi đơn vị ----------
if (want('unit')) {
  const o = (out.unit = await open('chuyen-doi-don-vi', '.erp-tool-rows'))
  const main = () => text('.erp-tool-result--inline')
  const rows = () => page.locator('.erp-tool-row').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim()))
  o.first = { main: await main(), heading: await text('.erp-flow__side .erp-flow-options__title'), rows: await rows() }
  await field('Giá trị').fill('2,5')
  await field('Sang đơn vị').selectOption('ft')
  o.metresToFeet = await main()
  await page.getByRole('button', { name: 'Đảo hai đơn vị' }).click()
  o.swapped = { from: await field('Từ đơn vị').inputValue(), to: await field('Sang đơn vị').inputValue(), main: await main() }
  await page.getByRole('button', { name: 'Chép kết quả' }).click()
  o.copied = await clipboard()
  await page.locator('.erp-tool-row .erp-tool-copy').first().click()
  o.copiedRow = await clipboard()
  await shot('unit-length')

  await field('Giá trị').fill('hai mét')
  o.invalid = { main: await main(), side: await text('.erp-flow__side .erp-flow-field__hint'), marked: await field('Giá trị').evaluate((el) => el.classList.contains('is-invalid')), rows: await page.locator('.erp-tool-row').count() }
  await field('Giá trị').fill('')
  o.blank = await main()

  await field('Giá trị').fill('1')
  await page.locator('.erp-tool-tab', { hasText: 'Diện tích' }).click()
  o.area = { main: await main(), rows: await rows() }
  await page.locator('.erp-tool-tab', { hasText: 'Khối lượng' }).click()
  await field('Giá trị').fill('1.250,5')
  o.mass = { main: await main(), rows: await rows() }
  // Về lại chiều dài: cặp đơn vị đã chọn còn nguyên.
  await page.locator('.erp-tool-tab', { hasText: 'Chiều dài' }).click()
  o.keptPair = { from: await field('Từ đơn vị').inputValue(), to: await field('Sang đơn vị').inputValue() }
  o.overflow = await overflow()
}

// ---------- 5. Đếm ký tự ----------
if (want('count')) {
  const o = (out.count = await open('dem-ky-tu', '.erp-tool-stats'))
  const stats = () => page.locator('.erp-tool-stat').evaluateAll((items) => Object.fromEntries(items.map((item) => [item.querySelector('dt').firstChild.textContent.trim(), item.querySelector('dd').innerText.trim()])))
  o.empty = { stats: await stats(), clearDisabled: await page.getByRole('button', { name: 'Xoá hết' }).isDisabled() }
  const area = field('Văn bản cần đếm')
  await area.fill('Nghiệm thu cốt thép sàn tầng 3.\nKhối lượng: 12,5 tấn — đạt.\n\nGhi chú 👍🏽')
  await page.waitForTimeout(300)
  o.sample = await stats()
  await shot('count-sample')
  // Chữ gõ kiểu tổ hợp (NFD) phải đếm như chữ dựng sẵn.
  await area.fill('Nghiệm thu'.normalize('NFD'))
  await page.waitForTimeout(300)
  o.decomposed = await stats()
  await area.fill(`${'Bê tông mác 300 đổ sàn. '.repeat(20000)}`)
  await page.waitForFunction(() => document.querySelector('.erp-tool-stat dd').innerText.replace(/\D/g, '') === '480000', null, { timeout: 30000 })
  o.large = await stats()
  await page.getByRole('button', { name: 'Xoá hết' }).click()
  await page.waitForTimeout(300)
  o.cleared = { stats: await stats(), value: await area.inputValue() }
  o.overflow = await overflow()
}

// ---------- 6. Màu sắc ----------
if (want('color')) {
  const o = (out.color = await open('mau-sac', '.erp-color-swatch'))
  const codes = async () => ({ hex: await field('HEX').inputValue(), rgb: await field('RGB').inputValue(), hsl: await field('HSL').inputValue(), swatch: await page.locator('.erp-color-swatch').evaluate((el) => getComputedStyle(el).backgroundColor), picker: await page.locator('.erp-color-pick__input').inputValue() })
  const contrasts = () => page.locator('.erp-color-contrast').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim()))
  o.first = { ...(await codes()), brand: await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--erp-brand').trim()), contrasts: await contrasts(), eyeDropper: await page.getByRole('button', { name: 'Hút màu từ màn hình' }).count() }
  await shot('color-first')

  await field('HEX').fill('#3678d4')
  o.fromHex = { ...(await codes()), contrasts: await contrasts() }
  // Đang gõ dở: ô giữ chữ đang gõ, mã ba chữ số đã là một màu.
  await field('HEX').fill('#fa0')
  o.shortHex = { typed: await field('HEX').inputValue(), rgb: await field('RGB').inputValue() }
  await field('RGB').focus()
  o.afterBlur = await field('HEX').inputValue()
  await field('HEX').fill('#12')
  o.badHex = { marked: await field('HEX').evaluate((el) => el.classList.contains('is-invalid')), rgb: await field('RGB').inputValue() }
  await field('RGB').fill('16, 24, 32')
  o.fromRgb = { ...(await codes()), contrasts: await contrasts() }
  await field('HSL').fill('120 100% 25%')
  await field('HEX').focus()
  o.fromHsl = await codes()
  await page.locator('.erp-color-pick__input').fill('#ffffff')
  o.fromPicker = { ...(await codes()), contrasts: await contrasts() }
  await page.locator('.erp-color-code .erp-tool-copy').nth(1).click()
  o.copiedRgb = await clipboard()
  await field('HEX').fill('#C98245')
  await field('RGB').focus()
  await shot('color-copper')
  o.overflow = await overflow()
}

// ---------- 7. Tạo mã ngẫu nhiên ----------
if (want('random')) {
  const o = (out.random = await open('tao-ma-ngau-nhien', '.erp-tool-rows'))
  const values = () => texts('.erp-tool-row__code')
  const strength = () => text('.erp-code-strength')
  const first = await values()
  o.first = { count: first.length, length: first[0].length, classes: [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].map((pattern) => pattern.test(first[0])), strength: await strength(), heading: await text('.erp-tool-side-head .erp-flow-options__title') }
  await shot('random-password')
  await page.getByRole('button', { name: 'Tạo lại' }).click()
  o.regenerated = (await values())[0] !== first[0]
  await page.locator('.erp-tool-row .erp-tool-copy').first().click()
  o.copied = (await clipboard()) === (await values())[0]

  await field('Ký hiệu (!@#$…)').check()
  await setRange(32)
  await field('Bỏ ký tự dễ nhìn nhầm (0 O o 1 l I)').check()
  await field('Số lượng mỗi lượt (tối đa 20)').fill('20')
  const many = await values()
  o.many = { count: many.length, unique: new Set(many).size, lengths: [...new Set(many.map((value) => value.length))], lookalike: many.some((value) => /[0Oo1lI]/.test(value)), allClasses: many.every((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /[0-9]/.test(value) && /[^a-zA-Z0-9]/.test(value)), strength: await strength(), heading: await text('.erp-tool-side-head .erp-flow-options__title') }
  await page.getByRole('button', { name: 'Chép tất cả' }).click()
  o.copiedAll = (await clipboard()) === many.join('\n')

  await setRange(8)
  for (const label of ['Chữ hoa (A–Z)', 'Chữ thường (a–z)', 'Ký hiệu (!@#$…)']) await field(label).uncheck()
  o.digitsOnly = { sample: (await values())[0], strength: await strength() }
  await field('Chữ số (0–9)').uncheck()
  o.noClass = { rows: await page.locator('.erp-tool-row').count(), hint: await text('.erp-flow__side .erp-flow-field__hint'), runDisabled: await page.getByRole('button', { name: 'Tạo lại' }).isDisabled(), strength: await strength() }

  await page.locator('.erp-tool-tab', { hasText: 'Mã đơn, mã phiếu' }).click()
  const codes = await values()
  o.codes = { count: codes.length, unique: new Set(codes).size, pattern: codes.every((value) => /^[A-HJ-NP-Z2-9]{8}$/.test(value)), sample: codes[0] }
  await field('Tiền tố (không bắt buộc)').fill('PX-2026-')
  await setRange(6)
  await field('Phần ngẫu nhiên gồm').selectOption('digits')
  await field('Số lượng mỗi lượt (tối đa 100)').fill('100')
  const batch = await values()
  o.batch = { count: batch.length, unique: new Set(batch).size, pattern: batch.every((value) => /^PX-2026-[0-9]{6}$/.test(value)), sample: batch[0], hint: await page.locator('.erp-tool-form .erp-flow-field__hint').count() }
  await shot('random-codes')
  await field('Số lượng mỗi lượt (tối đa 100)').fill('500')
  o.clamped = { input: await field('Số lượng mỗi lượt (tối đa 100)').inputValue(), count: (await values()).length }
  // Về lại mật khẩu: tuỳ chọn cũ còn nguyên (đang không bật nhóm nào).
  await page.locator('.erp-tool-tab', { hasText: 'Mật khẩu' }).click()
  o.backToPassword = { rows: await page.locator('.erp-tool-row').count(), length: await page.locator('input[type=range]').inputValue() }
  o.overflow = await overflow()
}

// ---------- 8. Ghi chú nhanh ----------
if (want('note')) {
  await page.goto(`${HUB}/ghi-chu-nhanh`)
  await page.evaluate(() => localStorage.removeItem('erpcons.tools.notes'))
  const o = (out.note = await open('ghi-chu-nhanh', '.erp-notes'))
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('erpcons.tools.notes') ?? 'null'))
  const items = () => page.locator('.erp-note-item').evaluateAll((list) => list.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim()))
  const visible = async () => ({ list: await page.locator('.erp-notes__list').isVisible(), editor: await page.locator('.erp-notes__editor').isVisible() })
  o.empty = { ...(await visible()), listHint: await text('.erp-notes__list .erp-flow-field__hint'), notice: await text('.erp-notes__notice'), emptyText: await text('.erp-notes__empty-text'), stored: await stored() }
  await shot('note-empty')

  await page.locator('.erp-notes__list').getByRole('button', { name: 'Ghi chú mới' }).click()
  await field('Tiêu đề').waitFor()
  o.afterCreate = { ...(await visible()), items: await items(), back: await page.locator('.erp-notes__back').isVisible() }
  await field('Tiêu đề').fill('Việc ở công trường thứ Hai')
  await field('Nội dung').fill('Nghiệm thu cốt thép sàn tầng 3.\nGọi nhà cung cấp bê tông.')
  for (const task of ['Kiểm tra cốp pha', 'Đặt thép D16', 'Ký biên bản']) {
    await field('Việc mới').fill(task)
    await field('Việc mới').press('Enter')
  }
  await page.locator('.erp-note-task').nth(1).locator('input[type=checkbox]').check()
  await field('Việc 3').fill('Ký biên bản nghiệm thu')
  await page.getByRole('button', { name: 'Bỏ việc 1' }).click()
  o.edited = { tasks: await page.locator('.erp-note-task__text').evaluateAll((list) => list.map((input) => input.value)), done: await page.locator('.erp-note-task.is-done').count(), saved: await text('.erp-notes__saved'), addDisabled: await page.getByRole('button', { name: 'Thêm', exact: true }).isDisabled() }
  await shot('note-editing')

  // Ghi chú thứ hai; bấm "Ghi chú mới" lần nữa khi nó còn trống thì mở lại nó, không đẻ thêm ghi chú rỗng.
  const back = async () => {
    if (await page.locator('.erp-notes__back').isVisible()) await page.locator('.erp-notes__back').click()
  }
  const addNote = page.locator('.erp-notes__list').getByRole('button', { name: 'Ghi chú mới' })
  await back()
  await addNote.click()
  await page.waitForFunction(() => document.querySelector('.erp-notes__editor input')?.value === '')
  await back()
  await addNote.click()
  await field('Tiêu đề').waitFor()
  o.afterSecond = { count: (await stored()).notes.length, items: await items() }
  await field('Nội dung').fill('Mua thêm 20 bao xi măng')
  await back()
  o.secondLabel = await items()

  // Tải lại trang: ghi chú còn nguyên.
  await page.reload()
  await page.locator('.erp-notes').waitFor()
  await page.waitForTimeout(300)
  o.afterReload = { ...(await visible()), items: await items(), heading: await text('.erp-notes__list .erp-tool-panel__title') }
  await back()
  await page.locator('.erp-note-item', { hasText: 'Việc ở công trường' }).click()
  o.reopened = { title: await field('Tiêu đề').inputValue(), body: await field('Nội dung').inputValue(), tasks: await page.locator('.erp-note-task__text').evaluateAll((list) => list.map((input) => input.value)), done: await page.locator('.erp-note-task.is-done .erp-note-task__text').evaluateAll((list) => list.map((input) => input.value)) }
  const saved = await stored()
  o.storedShape = { version: saved.version, notes: saved.notes.length, keys: Object.keys(saved.notes[0]).sort().join(',') }
  await shot('note-reopened')

  // Xoá một ghi chú: phải hỏi trước.
  await page.getByRole('button', { name: 'Xoá ghi chú' }).click()
  const confirm = page.locator('.popover')
  await confirm.waitFor()
  o.confirm = { title: await text('.popover-header'), body: (await text('.popover-body')).slice(0, 80), count: (await stored()).notes.length }
  await confirm.getByRole('button', { name: 'Xoá', exact: true }).click()
  await page.waitForTimeout(300)
  o.afterDelete = { count: (await stored()).notes.length, items: await items(), ...(await visible()) }

  // Dữ liệu hỏng trong localStorage không làm vỡ màn.
  await page.evaluate(() => localStorage.setItem('erpcons.tools.notes', '{"notes":[{"id":"x","title":5,"tasks":"sai"},null,"rác"]}'))
  await page.reload()
  await page.locator('.erp-notes').waitFor()
  await page.waitForTimeout(300)
  o.corrupt = { items: await items() }
  await page.evaluate(() => localStorage.removeItem('erpcons.tools.notes'))
  o.overflow = await overflow()
}

// ---------- 9. Trong khung app (đã đăng nhập) ----------
if (!only) {
  stage = 'app'
  await mockSession(context)
  await page.goto(`${APP_HUB}/tao-ma-qr`)
  await page.locator('.erp-qr-preview').waitFor({ timeout: 30000 })
  await field('Nhập nội dung').fill('erpcons.vn')
  await page.locator('.erp-qr-preview__code').waitFor()
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Tải mã QR' }).click()])
  await dl.cancel()
  await page.waitForTimeout(400)
  out.app = { path: new URL(page.url()).pathname, frame: (await page.locator('.erp-tools-guest').count()) === 0, nudge: await page.locator('.erp-doc-nudge').count(), tabHref: await page.locator('.erp-tool-tab', { hasText: 'Quét mã' }).getAttribute('href'), overflow: await overflow() }
  await shot('app-qr-create')
}

await browser.close()

// ---------- 10. Quét bằng camera (trình duyệt thứ hai, camera giả phát mã QR) ----------
if (want('camera')) {
  const o = (out.camera = {})
  // Khung hình 640×480 nền trắng, mã ở giữa; lặp 15 khung để Chrome coi là một đoạn phim.
  ;({ browser, context, page } = await start())
  await page.goto(HUB)
  stage = 'camera'
  const luma = await lumaFrame(640, 480, qrFiles[0].buffer.toString('base64'))
  await browser.close()
  // Y4M 4:2:0: mặt phẳng sáng của khung hình + hai mặt phẳng màu trung tính (ảnh đen trắng).
  const chroma = Buffer.alloc((640 * 480) / 2, 128)
  const movie = `${OUT}camera-qr.y4m`.replaceAll('/', '\\')
  fs.writeFileSync(movie, Buffer.concat([Buffer.from('YUV4MPEG2 W640 H480 F15:1 Ip A1:1 C420jpeg\n'), ...Array.from({ length: 15 }, () => [Buffer.from('FRAME\n'), luma, chroma]).flat()]))
  ;({ browser, context, page } = await start(['--use-fake-device-for-media-stream', `--use-file-for-fake-video-capture=${movie}`]))

  await open('doc-ma-qr', '.erp-flow-picker')
  await page.getByRole('button', { name: 'Quét bằng camera' }).click()
  await page.locator('.erp-camera__view').waitFor()
  o.starting = await text('.erp-camera__status')
  const hit = page.locator('.erp-scan-hit')
  const found = await hit
    .first()
    .waitFor({ timeout: 30000 })
    .then(() => true)
    .catch(() => false)
  o.found = found
  o.live = { video: await page.locator('.erp-camera__video').evaluate((v) => `${v.videoWidth}x${v.videoHeight} hidden=${v.hidden}`), hint: await text('.erp-tool-panel .erp-flow-field__hint'), extraButton: await page.getByRole('button', { name: 'Quét bằng camera' }).count() }
  if (found) o.hit = { text: await text('.erp-scan-hit__text'), format: await text('.erp-scan-hit__format') }
  // Mã vẫn nằm trước ống kính vài giây: không được đẻ dòng trùng.
  await page.waitForTimeout(4000)
  o.afterWait = await hit.count()
  await page.screenshot({ path: `${OUT}${theme}-${vw}-qr-read-camera.png`, fullPage: true })
  o.overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

  await page.getByRole('button', { name: 'Tắt camera' }).click()
  await page.waitForTimeout(600)
  o.afterOff = { panel: await page.locator('.erp-camera__view').count(), tracks: await page.evaluate(() => window.__streams.flatMap((stream) => stream.getTracks().map((track) => track.readyState))), hits: await hit.count() }

  // Rời màn khi camera còn bật: luồng phải tắt.
  await page.getByRole('button', { name: 'Quét bằng camera' }).click()
  await page.waitForFunction(() => document.querySelector('.erp-camera__video') && !document.querySelector('.erp-camera__video').hidden, null, { timeout: 30000 })
  await page.locator('.erp-tool-crumb__back').click()
  await page.locator('.erp-tools-grid').waitFor()
  await page.waitForTimeout(600)
  o.afterLeave = await page.evaluate(() => window.__streams.flatMap((stream) => stream.getTracks().map((track) => track.readyState)))
  await browser.close()
}

console.log(JSON.stringify({ ...out, errors }, null, 1))
