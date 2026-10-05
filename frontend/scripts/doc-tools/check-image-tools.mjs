// Công cụ ảnh của "Chuyện Nhỏ": chuyển đổi, nén, cắt & chỉnh, đo kích thước, và camera của "Scan ảnh → PDF".
// Mỗi công cụ được chạy THẬT rồi mở tệp tải về ra soi (chữ ký byte, kích thước, màu điểm ảnh, số trang).
// Ảnh mẫu sinh ngay trong trình duyệt bằng canvas — không cần tệp mẫu nào trên đĩa.
// Camera dùng thiết bị giả của Chrome (`--use-fake-device-for-media-stream`).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, outDir, HUB } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument } = appRequire('pdf-lib')
const { unzipSync } = appRequire('fflate')

const OUT = outDir('image-tools')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const want = (name) => !only || only.includes(name)

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true, permissions: ['camera'] })
// Ghi lại mọi luồng camera đã mở để kiểm chúng có được TẮT khi đóng cửa sổ chụp.
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
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
// Cắt / Đo đang có thay đổi thì `goto` bật hộp `beforeunload`; không nhận là script đứng im.
page.on('dialog', (dialog) => void dialog.accept())
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, fullPage: true })
const out = { theme, vw }

// ---------- Ảnh mẫu ----------

/** Vẽ ảnh mẫu trong trang rồi trả về Buffer. `kind` chọn nội dung. */
async function makeImage(kind, width, height, type, quality) {
  const base64 = await page.evaluate(
    async ({ kind, width, height, type, quality }) => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const c = canvas.getContext('2d')
      if (kind === 'photo') {
        // Nhiễu + dải màu: giống ảnh chụp, nén JPEG chất lượng cao ra tệp to — có chỗ cho công cụ nén.
        const data = c.createImageData(width, height)
        let seed = 12345
        for (let i = 0; i < data.data.length; i += 4) {
          seed = (seed * 1103515245 + 12345) & 0x7fffffff
          const noise = (seed >> 16) & 63
          const x = (i / 4) % width
          data.data[i] = ((x / width) * 190 + noise) | 0
          data.data[i + 1] = (((i / 4 / width) / height) * 190 + noise) | 0
          data.data[i + 2] = 96 + noise
          data.data[i + 3] = 255
        }
        c.putImageData(data, 0, 0)
      } else if (kind === 'quadrants') {
        // Bốn góc bốn màu: xoay / cắt sai là thấy ngay ở màu góc.
        const [w, h] = [width / 2, height / 2]
        c.fillStyle = 'rgb(255,0,0)'
        c.fillRect(0, 0, w, h)
        c.fillStyle = 'rgb(0,255,0)'
        c.fillRect(w, 0, w, h)
        c.fillStyle = 'rgb(0,0,255)'
        c.fillRect(0, h, w, h)
        c.fillStyle = 'rgb(255,255,0)'
        c.fillRect(w, h, w, h)
      } else if (kind === 'gray') {
        c.fillStyle = 'rgb(100,100,100)'
        c.fillRect(0, 0, width, height)
      } else if (kind === 'alpha') {
        // Nền trong suốt, một ô đỏ ở giữa.
        c.fillStyle = 'rgb(220,30,40)'
        c.fillRect(width / 4, height / 4, width / 2, height / 2)
      }
      const blob = await new Promise((done) => canvas.toBlob(done, type, quality))
      const bytes = new Uint8Array(await blob.arrayBuffer())
      let binary = ''
      for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
      return btoa(binary)
    },
    { kind, width, height, type, quality },
  )
  return Buffer.from(base64, 'base64')
}

/** Chèn khối EXIF chỉ mang cờ hướng vào ngay sau SOI của một JPEG. */
function withOrientation(jpeg, orientation) {
  const tiff = Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
  const body = Buffer.concat([Buffer.from('Exif\0\0', 'binary'), tiff])
  const header = Buffer.from([0xff, 0xe1, (body.length + 2) >> 8, (body.length + 2) & 0xff])
  return Buffer.concat([jpeg.subarray(0, 2), header, body, jpeg.subarray(2)])
}

const kindOf = (bytes) => {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return 'jpeg'
  if (bytes[0] === 0x89 && bytes[1] === 0x50) return 'png'
  if (bytes.subarray(0, 4).toString('latin1') === 'RIFF' && bytes.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp'
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'zip'
  if (bytes.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf'
  return 'unknown'
}

/** Giải mã một ảnh (Buffer) trong trang: kích thước + màu tại các điểm `[x, y]` (tỉ lệ 0–1). */
async function inspect(bytes, points = []) {
  return page.evaluate(
    async ({ base64, points }) => {
      const binary = atob(base64)
      const data = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i)
      const bitmap = await createImageBitmap(new Blob([data]))
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const c = canvas.getContext('2d')
      c.drawImage(bitmap, 0, 0)
      const pixels = points.map(([x, y]) => Array.from(c.getImageData(Math.min(bitmap.width - 1, Math.floor(x * bitmap.width)), Math.min(bitmap.height - 1, Math.floor(y * bitmap.height)), 1, 1).data))
      return { width: bitmap.width, height: bitmap.height, pixels }
    },
    { base64: bytes.toString('base64'), points },
  )
}

// ---------- Thao tác chung ----------

const files = () => page.locator('.erp-flow-file')
const runButton = () => page.locator('.erp-flow__run')
const result = () => page.locator('.erp-flow-result')
const hint = async () => ((await page.locator('.erp-flow__hint').count()) ? page.locator('.erp-flow__hint').innerText() : null)
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

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
  return { title: await page.title(), picker: await page.locator('.erp-flow-picker__title').innerText(), hint: await page.locator('.erp-flow-picker__hint').innerText() }
}

const add = (list) => page.locator('.erp-flow-picker input[type=file]').setInputFiles(list)

async function run(timeout = 120000) {
  await runButton().click()
  await result().waitFor({ timeout })
  return {
    title: await page.locator('.erp-flow-result__title').innerText(),
    badge: (await page.locator('.erp-flow-result__badge').getAttribute('class')).split('--')[1],
    file: await page.locator('.erp-flow-result__file-name').innerText(),
    meta: await page.locator('.erp-flow-result__file-meta').innerText(),
    notes: await page.locator('.erp-flow-note').allInnerTexts(),
    buttons: await page.locator('.erp-flow-result__more .btn').allInnerTexts(),
  }
}

async function download() {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Tải về' }).click()])
  const path = `${OUT}${theme}-${vw}-${dl.suggestedFilename()}`
  await dl.saveAs(path)
  return { name: dl.suggestedFilename(), bytes: fs.readFileSync(path) }
}

const restart = async () => {
  await page.getByRole('button', { name: 'Làm lại' }).click()
  await page.locator('.erp-flow-picker').waitFor()
}

const file = (name, mimeType, buffer) => ({ name, mimeType, buffer })

/** Bấm đường về trang chọn khi công cụ đang giữ thay đổi: phải hỏi, và "Ở lại" giữ nguyên màn. */
async function leaveGuard() {
  const modal = page.getByRole('dialog').filter({ hasText: 'Rời trang này?' })
  await page.locator('.erp-tool-crumb__back').click()
  const asked = await modal
    .waitFor({ timeout: 4000 })
    .then(() => true)
    .catch(() => false)
  if (asked) await modal.getByRole('button', { name: 'Ở lại' }).click()
  await page.waitForTimeout(400)
  return { asked, path: new URL(page.url()).pathname }
}

await page.goto(HUB)
const photo = await makeImage('photo', 2400, 1600, 'image/jpeg', 0.98)
const alphaPng = await makeImage('alpha', 800, 600, 'image/png')
const webp = await makeImage('photo', 1200, 900, 'image/webp', 0.9)
const quadrants = await makeImage('quadrants', 400, 200, 'image/png')
const gray = await makeImage('gray', 300, 200, 'image/png')
out.fixtures = { photo: photo.length, alphaPng: alphaPng.length, webp: webp.length, webpKind: kindOf(webp) }

// ---------- 1. Chuyển đổi ảnh ----------
if (want('convert')) {
  const o = (out.convert = await open('chuyen-doi-anh'))
  o.emptyRun = { disabled: await runButton().isDisabled(), hint: await hint() }
  await shot('convert-empty')

  // Nhận tệp: ảnh xoay theo EXIF, tệp giả mạo đuôi, HEIC.
  await add([
    file('Công trình.jpg', 'image/jpeg', photo),
    file('xoay-exif.jpg', 'image/jpeg', withOrientation(photo, 6)),
    file('logo.png', 'image/png', alphaPng),
    file('ảnh.webp', 'image/webp', webp),
    file('gia-mao.png', 'image/png', Buffer.from('%PDF-1.7 khong phai anh')),
    file('iphone.heic', 'image/heic', Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypheic'), Buffer.alloc(32)])),
  ])
  await files().nth(3).waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
  o.files = await page.locator('.erp-flow-file').evaluateAll((rows) => rows.map((row) => `${row.querySelector('.erp-flow-file__name').textContent} | ${row.querySelector('.erp-flow-file__meta').textContent}`))
  o.thumbnails = await page.locator('.erp-flow-file__thumb img').count()
  o.rejected = await page.locator('.erp-flow-rejected__list li').allInnerTexts()
  await shot('convert-files')

  await page.getByRole('radio', { name: /^WebP/ }).check()
  o.runLabel = await runButton().innerText()
  o.webp = await run()
  await shot('convert-result')
  const zip = await download()
  const entries = unzipSync(zip.bytes)
  o.webpZip = { name: zip.name, kind: kindOf(zip.bytes), entries: Object.fromEntries(Object.entries(entries).map(([name, bytes]) => [name, kindOf(Buffer.from(bytes))])) }
  // Ảnh đã là WebP phải được giữ nguyên từng byte.
  o.webpKeptBytes = Buffer.from(entries['ảnh.webp'] ?? []).equals(webp)
  // Ảnh EXIF hướng 6 (xoay 90°): kết quả phải là ảnh DỌC 1600 × 2400.
  const turned = await inspect(Buffer.from(entries['xoay-exif.webp']))
  o.exifTurned = `${turned.width}x${turned.height}`

  // PNG nền trong suốt -> JPG: nền phải trắng, không đen.
  await restart()
  await page.getByRole('button', { name: 'Bỏ tất cả' }).click()
  await add([file('logo.png', 'image/png', alphaPng)])
  await files().first().waitFor()
  await page.getByRole('radio', { name: /^JPG/ }).check()
  o.jpg = await run()
  const jpg = await download()
  const flattened = await inspect(jpg.bytes, [
    [0.02, 0.02],
    [0.5, 0.5],
  ])
  o.jpgOut = { name: jpg.name, kind: kindOf(jpg.bytes), size: `${flattened.width}x${flattened.height}`, corner: flattened.pixels[0], center: flattened.pixels[1] }

  // Cùng định dạng thì chặn; hai tệp trùng tên sau khi đổi đuôi thì đánh số.
  await restart()
  await page.getByRole('radio', { name: /^PNG/ }).check()
  o.sameFormat = { disabled: await runButton().isDisabled(), hint: await hint(), qualityHidden: (await page.getByRole('radio', { name: /^Cao/ }).count()) === 0 }
  await add([file('logo.jpg', 'image/jpeg', photo)])
  await files().nth(1).waitFor()
  await page.getByRole('radio', { name: /^WebP/ }).check()
  await run()
  o.duplicateNames = Object.keys(unzipSync((await download()).bytes))
  o.overflow = await overflow()
}

// ---------- 2. Nén ảnh ----------
if (want('compress')) {
  const o = (out.compress = await open('nen-anh'))
  await add([file('Công trình.jpg', 'image/jpeg', photo)])
  await files().first().waitFor({ timeout: 60000 })
  await page.getByRole('radio', { name: /^Mạnh/ }).check()
  await page.getByLabel('Cạnh dài tối đa').selectOption('1280')
  await shot('compress-files')
  o.jpeg = await run()
  await shot('compress-result')
  const small = await download()
  const decoded = await inspect(small.bytes)
  o.jpegOut = { name: small.name, kind: kindOf(small.bytes), before: photo.length, after: small.bytes.length, size: `${decoded.width}x${decoded.height}` }

  // PNG phẳng: mã hoá lại không nhẹ hơn -> giữ nguyên tệp gốc, báo cảnh báo.
  await restart()
  await page.getByRole('button', { name: /^Bỏ Công trình/ }).click()
  await page.getByLabel('Cạnh dài tối đa').selectOption('0')
  await add([file('xam.png', 'image/png', gray)])
  await files().first().waitFor()
  o.png = await run()
  const kept = await download()
  o.pngOut = { name: kept.name, sameBytes: kept.bytes.equals(gray) }
  await shot('compress-warning')

  // Lô lẫn lộn: ra .zip, ảnh nén được đổi tên, ảnh không nén được giữ tên gốc.
  await restart()
  await add([file('Công trình.jpg', 'image/jpeg', photo), file('ảnh.webp', 'image/webp', webp)])
  await files().nth(2).waitFor({ timeout: 60000 })
  o.runLabel = await runButton().innerText()
  o.batch = await run()
  o.batchZip = Object.keys(unzipSync((await download()).bytes))
  o.overflow = await overflow()
}

// ---------- 3. Cắt & chỉnh ảnh ----------
if (want('crop')) {
  const o = (out.crop = await open('cat-chinh-anh'))
  await add([file('bon-goc.png', 'image/png', quadrants)])
  const box = page.locator('.erp-crop__box')
  await box.waitFor({ timeout: 60000 })
  const outputSize = () => page.locator('.erp-image-output strong').innerText()
  o.fileListHidden = (await files().count()) === 0
  o.pristine = { disabled: await runButton().isDisabled(), hint: await hint(), output: await outputSize() }
  // Chưa chỉnh gì thì không có gì để mất: `beforeunload` không được bật.
  o.pristineUnload = await page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true })))
  // Nút chọn tệp đang đổi màu (to -> gọn): chờ hết hiệu ứng rồi mới chụp.
  await page.waitForTimeout(400)
  await shot('crop-open')

  // Xoay phải: 400 × 200 -> 200 × 400; góc trên-trái phải là màu của góc dưới-trái cũ (xanh dương).
  await page.getByRole('button', { name: 'Xoay phải' }).click()
  o.afterTurn = await outputSize()
  const turned = await run()
  const turnedFile = await download()
  const turnedPixels = await inspect(turnedFile.bytes, [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75],
  ])
  o.turned = { result: turned.title, meta: turned.meta, name: turnedFile.name, kind: kindOf(turnedFile.bytes), size: `${turnedPixels.width}x${turnedPixels.height}`, corners: turnedPixels.pixels.map((p) => p.slice(0, 3).join(',')) }

  // Làm lại giữ nguyên phần đã chỉnh. Chọn 1:1 trên ảnh đã xoay (200 × 400) -> khung 200 × 200 ở giữa.
  await restart()
  await box.waitFor()
  o.keptAfterRestart = await outputSize()
  await page.getByLabel('Tỉ lệ khung cắt').selectOption('1:1')
  o.square = await outputSize()
  // Kéo khung lên sát mép trên bằng chuột: phần giữ lại là nửa trên (xanh dương | đỏ).
  const rect = await box.boundingBox()
  await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2)
  await page.mouse.down()
  await page.mouse.move(rect.x + rect.width / 2, rect.y - 400, { steps: 6 })
  await page.mouse.up()
  // Bàn phím: thu khung từ góc dưới-phải.
  await page.locator('.erp-crop__handle--se').focus()
  for (let i = 0; i < 3; i++) await page.keyboard.press('Shift+ArrowLeft')
  o.afterKeyboard = await outputSize()
  await shot('crop-edited')
  o.leave = { ...(await leaveGuard()), output: await outputSize(), unload: await page.evaluate(() => !window.dispatchEvent(new Event('beforeunload', { cancelable: true }))) }
  const cropped = await run()
  const croppedFile = await download()
  const croppedPixels = await inspect(croppedFile.bytes, [
    [0.25, 0.5],
    [0.75, 0.5],
  ])
  o.cropped = { meta: cropped.meta, size: `${croppedPixels.width}x${croppedPixels.height}`, leftRight: croppedPixels.pixels.map((p) => p.slice(0, 3).join(',')) }
  await shot('crop-result')

  // Độ sáng 150% trên ảnh xám 100 -> 150; tương phản giữ nguyên. Đặt lại đưa về ảnh gốc.
  await restart()
  await add([file('xam.png', 'image/png', gray)])
  await box.waitFor()
  await page.waitForTimeout(300)
  o.resetOnNewImage = { output: await outputSize(), disabled: await runButton().isDisabled() }
  const brightness = page.getByLabel(/^Độ sáng/)
  await brightness.evaluate((element) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(element, '149')
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await brightness.focus()
  await page.keyboard.press('ArrowRight')
  o.brightnessLabel = await page.locator('.erp-image-range__value').first().innerText()
  o.previewFilter = await page.locator('.erp-image-stage__canvas').evaluate((element) => getComputedStyle(element).filter)
  await run()
  const bright = await inspect((await download()).bytes, [[0.5, 0.5]])
  o.brightPixel = bright.pixels[0].slice(0, 3).join(',')
  await restart()
  await page.getByRole('button', { name: 'Đặt lại như ảnh gốc' }).click()
  o.afterReset = { disabled: await runButton().isDisabled(), label: await page.locator('.erp-image-range__value').first().innerText() }
  o.overflow = await overflow()
}

// ---------- 4. Đo kích thước ảnh ----------
if (want('measure')) {
  const o = (out.measure = await open('do-kich-thuoc-anh'))
  const plain = await makeImage('gray', 1000, 500, 'image/png')
  await add([file('mat-bang.png', 'image/png', plain)])
  const frame = page.locator('.erp-measure')
  await frame.waitFor({ timeout: 60000 })
  await page.locator('.erp-measure__image').evaluate((img) => img.decode())
  /** Bấm vào toạ độ ẢNH (1000 × 500). */
  const click = async (x, y) => {
    await frame.scrollIntoViewIfNeeded()
    const box = await frame.boundingBox()
    await page.mouse.click(box.x + (x / 1000) * box.width, box.y + (y / 500) * box.height)
  }
  const labels = () => page.locator('.erp-measure__label').allInnerTexts()
  const results = () => page.locator('.erp-measure-result').evaluateAll((rows) => rows.map((row) => row.innerText.replace(/\s+/g, ' ').trim()))
  o.empty = { disabled: await runButton().isDisabled(), hint: await hint(), warning: await page.locator('.erp-measure-warning').innerText() }

  // Chưa có đoạn chuẩn: số đo theo điểm ảnh.
  await click(100, 100)
  await click(350, 100)
  o.pixels = await labels()
  await shot('measure-pixels')

  // Đoạn chuẩn 500 px = 2 m -> đoạn 250 px ở trên thành 1 m.
  await page.getByRole('button', { name: 'Đặt đoạn chuẩn' }).click()
  o.referenceHint = await page.locator('.erp-measure-hint').innerText()
  await click(100, 450)
  await click(600, 450)
  const length = page.getByLabel('Chiều dài thật của đoạn chuẩn')
  o.lengthFocused = await length.evaluate((element) => document.activeElement === element)
  await length.fill('2,')
  o.typingKept = await length.inputValue()
  await length.fill('2')
  o.afterReference = { labels: await labels(), mode: await page.locator('.erp-measure-tab.is-active').innerText() }

  // Vùng 250 × 250 px = 1 m², khép bằng cách bấm lại điểm đầu.
  await page.getByRole('button', { name: 'Đo diện tích' }).click()
  await click(500, 100)
  await click(750, 100)
  await click(750, 350)
  await click(500, 350)
  await page.locator('.erp-measure__grip--close').click()
  // Đếm 3, bấm lại vào điểm thứ hai để bỏ.
  await page.getByRole('button', { name: 'Đếm số lượng' }).click()
  await click(850, 80)
  await click(900, 160)
  await click(950, 240)
  o.counted = await page.locator('.erp-measure__count').allInnerTexts()
  await page.locator('.erp-measure__count').nth(1).click()
  o.afterUncount = await page.locator('.erp-measure__count').allInnerTexts()
  o.results = await results()
  await shot('measure-shapes')
  o.leave = { ...(await leaveGuard()), results: (await results()).length }

  // Kéo một đầu đoạn bằng bàn phím: 10 bước Shift+mũi tên -> đoạn dài ra.
  await page.locator('.erp-measure__grip:not(.erp-measure__grip--reference)').nth(1).focus()
  await page.keyboard.press('Shift+ArrowRight')
  o.afterNudge = (await results())[0]
  // Hoàn tác bỏ hình cuối (điểm đếm); đổi đơn vị sang cm.
  await page.getByRole('button', { name: 'Hoàn tác' }).click()
  o.afterUndo = await page.locator('.erp-measure__count').count()
  await page.getByLabel('Đơn vị').selectOption('cm')
  o.inCm = (await results())[1]
  await page.getByLabel('Đơn vị').selectOption('m')

  o.saved = await run()
  await shot('measure-result')
  const measured = await download()
  // Điểm (625, 225) nằm giữa vùng đo: phải ngả màu nét vẽ, không còn xám 100 như ảnh gốc.
  const drawn = await inspect(measured.bytes, [
    [0.05, 0.6],
    [0.56, 0.6],
  ])
  o.savedFile = { name: measured.name, kind: kindOf(measured.bytes), size: `${drawn.width}x${drawn.height}`, untouched: drawn.pixels[0].slice(0, 3).join(','), insideArea: drawn.pixels[1].slice(0, 3).join(',') }
  fs.writeFileSync(`${OUT}${theme}-${vw}-measured-output.png`, measured.bytes)

  // Chọn ảnh khác là bắt đầu lại: không mang số đo và đoạn chuẩn của ảnh cũ sang.
  await restart()
  await add([file('anh-khac.png', 'image/png', gray)])
  await page.waitForTimeout(600)
  o.newImage = { labels: await labels(), results: await page.locator('.erp-measure-result').count(), warning: await page.locator('.erp-measure-warning').count() }
  o.overflow = await overflow()
}

// ---------- 5. Camera của "Scan ảnh → PDF" ----------
if (want('camera')) {
  const o = (out.camera = await open('anh-sang-pdf'))
  await shot('camera-picker')
  await page.getByRole('button', { name: 'Chụp ảnh' }).click()
  const modal = page.locator('.erp-camera')
  const shutter = page.locator('.erp-camera__shutter')
  await modal.waitFor()
  await page.waitForFunction(() => !document.querySelector('.erp-camera__shutter')?.disabled, null, { timeout: 30000 })
  o.live = { video: await page.locator('.erp-camera__video').evaluate((v) => `${v.videoWidth}x${v.videoHeight}`), count: await page.locator('.erp-camera__count').innerText(), use: await modal.getByRole('button', { name: /^Dùng/ }).isDisabled() }
  for (let i = 0; i < 3; i++) {
    await shutter.click()
    await page.locator('.erp-camera__thumb').nth(i).waitFor()
  }
  o.afterShots = { thumbs: await page.locator('.erp-camera__thumb').count(), count: await page.locator('.erp-camera__count').innerText(), close: await modal.locator('.modal-footer .btn').first().innerText() }
  await page.waitForTimeout(400)
  await shot('camera-live')

  // Cắt tay ảnh thứ hai: kéo góc dưới-phải vào giữa.
  await page.locator('.erp-camera__thumb').nth(1).click()
  const handle = page.locator('.erp-camera .erp-crop__handle--se')
  await handle.waitFor()
  const frame = await page.locator('.erp-camera .erp-image-stage__frame').boundingBox()
  const grip = await handle.boundingBox()
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2, { steps: 6 })
  await page.mouse.up()
  o.reviewTitle = await page.locator('#erp-camera-title').innerText()
  await page.waitForTimeout(300)
  await shot('camera-crop')
  await modal.getByRole('button', { name: 'Chụp tiếp' }).click()
  await modal.getByRole('button', { name: 'Dùng 3 ảnh' }).click()
  await files().nth(2).waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
  o.files = await page.locator('.erp-flow-file__name').allInnerTexts()
  // Ảnh thứ hai đã cắt tay nên phải nhỏ hơn hai ảnh còn lại.
  o.fileSizes = await page.locator('.erp-flow-file__meta').allInnerTexts()
  o.modalClosed = (await page.locator('.erp-camera.show').count()) === 0
  o.tracks = await page.evaluate(() => window.__streams.flatMap((stream) => stream.getTracks().map((track) => track.readyState)))
  await shot('camera-files')

  o.pdf = await run()
  const pdf = await download()
  const doc = await PDFDocument.load(pdf.bytes)
  const ratio = (index) => {
    const { width, height } = doc.getPage(index).getSize()
    return Number((width / height).toFixed(2))
  }
  o.pdfOut = { kind: kindOf(pdf.bytes), pages: doc.getPageCount(), ratios: [ratio(0), ratio(1), ratio(2)] }

  // Đóng giữa chừng: bỏ ảnh đã chụp, tắt camera.
  await restart()
  await page.getByRole('button', { name: 'Chụp ảnh' }).click()
  await page.waitForFunction(() => !document.querySelector('.erp-camera__shutter')?.disabled, null, { timeout: 30000 })
  await shutter.click()
  await page.locator('.erp-camera__thumb').first().waitFor()
  await modal.getByRole('button', { name: /^Bỏ 1 ảnh/ }).click()
  await page.waitForTimeout(800)
  o.afterDiscard = { files: await files().count(), tracks: await page.evaluate(() => window.__streams.flatMap((stream) => stream.getTracks().map((track) => track.readyState))) }
  o.overflow = await overflow()
}

console.log(JSON.stringify({ ...out, errors }, null, 1))
await browser.close()
