// Benchmark cho Limit Matrix của "Chuyện Nhỏ" (gate G1, v2.0 §10): tăng dần cỡ đầu vào ở các
// công cụ nặng, đo thời gian + bộ nhớ để CTO có số mà đặt trần (MB, điểm ảnh, số tệp, .zip, timeout).
//
//   node scripts/doc-tools/bench-limits.mjs              cả ma trận (lâu: hàng chục phút)
//   QUICK=1 node scripts/doc-tools/bench-limits.mjs      mỗi công cụ chỉ cỡ nhỏ nhất (thử script)
//   ONLY=nen-anh,ghep-pdf                                chạy riêng vài công cụ
//   MATCH='Word|Excel'                                   chỉ các ca có nhãn khớp biểu thức này
//   CPU=4                                                giả máy yếu: làm chậm CPU 4 lần
//
// `CPU` chỉ làm chậm LUỒNG CHÍNH của trang (CDP `Emulation.setCPUThrottlingRate`). Việc chạy trong
// worker — pdf.js đọc trang, tesseract nhận dạng chữ, WASM nén — không bị chậm theo, nên số của các
// công cụ dồn việc vào worker (OCR) là cận DƯỚI của máy yếu thật, không phải ước lượng.
//
// Tệp đo tự sinh vào FIXTURES/bench (ảnh vẽ trong Chrome, PDF dựng bằng pdf-lib) — cần sẵn
// `anh-van-ban.jpg` và `ho-so-500-trang.pdf` của `make-fixtures.mjs`.
//
// Mỗi ca chạy trong một Chrome MỚI: bộ nhớ của ca trước không lẫn vào ca sau. Hai số bộ nhớ:
//   - heapMb: đỉnh JS heap của luồng chính (không gồm worker, ArrayBuffer ngoài heap, canvas);
//   - memMb:  đỉnh bộ nhớ RIÊNG (private bytes) của mọi tiến trình con của Chrome (renderer + GPU +
//             utility) — gần với thứ làm tab chết trên máy yếu hơn; `idleMb` là mức lúc trang vừa mở,
//             chưa có tệp. Chỉ đo được trên Windows.
// Script KHÔNG đánh trượt: ca hỏng (bị từ chối, lỗi, hết giờ, tab chết) là dữ liệu, ghi vào bảng.
import { createRequire } from 'node:module'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { chromium, FIX, HUB, outDir } from './lib/qa.mjs'

const { PDFDocument } = createRequire(import.meta.url)('pdf-lib')

const OUT = outDir('bench-limits')
const BENCH = FIX + 'bench/'
fs.mkdirSync(BENCH, { recursive: true })
const quick = process.env.QUICK === '1'
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const match = process.env.MATCH ? new RegExp(process.env.MATCH) : null
const cpu = Number(process.env.CPU ?? 1)
const RUN_TIMEOUT = Number(process.env.RUN_TIMEOUT ?? 900000)
const mb = (bytes) => Math.round((bytes / 1048576) * 10) / 10

// ---------- Tệp đo ----------

/** Ảnh giả ảnh chụp: dải màu + chữ + nhiễu hạt (lát 512 px lặp lại — getImageData cả ảnh 79 MP là 316 MB). */
async function makeImages(specs) {
  const missing = specs.filter((spec) => !fs.existsSync(BENCH + spec.name))
  if (missing.length === 0) return
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage()
  await page.goto(HUB)
  for (const spec of missing) {
    const base64 = await page.evaluate(async ({ w, h, quality, seed = 0 }) => {
      const tile = document.createElement('canvas')
      tile.width = tile.height = 512
      const t = tile.getContext('2d')
      const noise = t.createImageData(512, 512)
      let s = 9973
      for (let i = 0; i < noise.data.length; i += 4) {
        s = (s * 1103515245 + 12345) & 0x7fffffff
        noise.data[i] = noise.data[i + 1] = noise.data[i + 2] = 128
        noise.data[i + 3] = s % 110
      }
      t.putImageData(noise, 0, 0)
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const x = c.getContext('2d')
      const g = x.createLinearGradient(0, 0, w, h)
      g.addColorStop(0, 'hsl(200,40%,75%)')
      g.addColorStop(0.5, 'hsl(35,45%,60%)')
      g.addColorStop(1, 'hsl(110,30%,35%)')
      x.fillStyle = g
      x.fillRect(0, 0, w, h)
      x.fillStyle = '#223'
      x.font = `${Math.round(w / 40)}px serif`
      for (let i = 0; i < 30; i++) x.fillText(`Dòng ${i + 1} — Biên bản nghiệm thu khối lượng hạng mục ${seed}`, w * 0.06, h * 0.08 + i * h * 0.03)
      // Dời lát nhiễu theo `seed`: mỗi trang một ảnh khác ĐIỂM ẢNH, không chỉ khác byte.
      x.translate(-((seed * 37) % 512), -((seed * 91) % 512))
      x.fillStyle = x.createPattern(tile, 'repeat')
      x.fillRect(0, 0, w + 512, h + 512)
      const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', quality))
      if (!blob) return null
      const reader = new FileReader()
      return new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1])
        reader.readAsDataURL(blob)
      })
    }, spec)
    if (!base64) throw new Error(`Chrome không vẽ được ảnh ${spec.w}x${spec.h}`)
    fs.writeFileSync(BENCH + spec.name, Buffer.from(base64, 'base64'))
  }
  await browser.close()
}

/** N bản sao của một tệp, mỗi bản một tên — app nhận như N tệp khác nhau. */
function copies(source, count, prefix) {
  const extension = source.split('.').pop()
  return Array.from({ length: count }, (_, index) => {
    const target = `${BENCH}${prefix}-${String(index + 1).padStart(3, '0')}.${extension}`
    if (!fs.existsSync(target)) fs.writeFileSync(target, extension === 'jpg' ? tagged(fs.readFileSync(source), index) : fs.readFileSync(source))
    return target
  })
}

/** Chèn một khối chú thích (COM) ngay sau SOI: cùng ảnh nhưng khác byte — app gộp các ảnh trùng byte khi dựng PDF. */
function tagged(jpeg, index) {
  const note = Buffer.from(`bench-${index}`)
  return Buffer.concat([jpeg.subarray(0, 2), Buffer.from([0xff, 0xfe, (note.length + 2) >> 8, (note.length + 2) & 0xff]), note, jpeg.subarray(2)])
}

/**
 * PDF scan, mỗi trang một ảnh khác ĐIỂM ẢNH. Ảnh giống nhau thì app gộp lại (`pdf-dedupe`) —
 * kể cả khi chỉ khác byte, vì nén xong chúng lại trùng nhau — và tệp ra nhẹ bất thường.
 * `salt` làm hai tệp cùng bộ trang khác byte nhau (ca ghép hai tệp).
 */
async function scanPdf(name, pages, salt = 0) {
  const target = BENCH + name
  if (fs.existsSync(target)) return target
  await makeImages(Array.from({ length: pages }, (_, index) => scanSpec(index)))
  const doc = await PDFDocument.create()
  for (let i = 0; i < pages; i++) {
    const jpeg = fs.readFileSync(BENCH + scanSpec(i).name)
    doc.addPage(A4).drawImage(await doc.embedJpg(salt ? tagged(jpeg, salt + i) : jpeg), { x: 0, y: 0, width: A4[0], height: A4[1] })
  }
  fs.writeFileSync(target, await doc.save())
  return target
}

async function slicePdf(name, pages) {
  const target = BENCH + name
  if (fs.existsSync(target)) return target
  const source = await PDFDocument.load(fs.readFileSync(FIX + 'ho-so-500-trang.pdf'))
  const doc = await PDFDocument.create()
  for (const page of await doc.copyPages(source, Array.from({ length: pages }, (_, index) => index))) doc.addPage(page)
  fs.writeFileSync(target, await doc.save())
  return target
}

/** `pages` trang bảng kê: lặp lại các trang của `bang-ke.pdf` — bảng có kẻ viền, đúng thứ PDF → Excel đọc. */
async function tablePdf(name, pages) {
  const target = BENCH + name
  if (fs.existsSync(target)) return target
  const source = await PDFDocument.load(fs.readFileSync(FIX + 'bang-ke.pdf'))
  const count = source.getPageCount()
  const doc = await PDFDocument.create()
  for (const page of await doc.copyPages(source, Array.from({ length: pages }, (_, index) => index % count))) doc.addPage(page)
  fs.writeFileSync(target, await doc.save())
  return target
}

const A4 = [595.28, 841.89]
/** Trang scan A4 ở 200 DPI. */
const scanSpec = (index) => ({ name: `scan-a4-${String(index + 1).padStart(3, '0')}.jpg`, w: 1654, h: 2339, quality: 0.92, seed: index + 1 })

const PHOTO = { name: 'anh-12mp.jpg', w: 4000, h: 3000, quality: 0.92 }
const BIG = [
  { name: 'anh-24mp.jpg', w: 6000, h: 4000, quality: 0.92 },
  { name: 'anh-48mp.jpg', w: 8000, h: 6000, quality: 0.92 },
  { name: 'anh-79mp.jpg', w: 10600, h: 7450, quality: 0.92 },
]

await makeImages([PHOTO, ...BIG, scanSpec(0)])
const photoBytes = fs.statSync(BENCH + PHOTO.name).size
const scanBytes = fs.statSync(BENCH + scanSpec(0).name).size
/** Số trang scan để tệp nặng xấp xỉ `megabytes`. */
const scanPages = (megabytes) => Math.max(1, Math.round((megabytes * 1048576) / scanBytes))

const photos = (count) => () => copies(BENCH + PHOTO.name, count, 'anh')
const steps = (values) => (quick ? values.slice(0, 1) : values)

/** tool = slug; `size` là nhãn của ca trong bảng. */
const CASES = [
  ...steps([10, 25, 50, 100]).map((n) => ({ tool: 'nen-anh', size: `${n} ảnh 12 MP`, files: photos(n) })),
  ...steps([PHOTO, ...BIG]).map((spec) => ({
    tool: 'chuyen-doi-anh',
    size: `1 ảnh ${Math.round((spec.w * spec.h) / 1e6)} MP → WebP`,
    files: () => [BENCH + spec.name],
    before: (page) => page.getByRole('radio', { name: /^WebP/ }).check(),
  })),
  ...steps([10, 25, 50, 100]).map((n) => ({ tool: 'anh-sang-pdf', size: `${n} ảnh 12 MP`, files: photos(n) })),
  ...steps([10, 50, 95]).map((size) => ({
    tool: 'ghep-pdf',
    size: `2 tệp × ~${size} MB`,
    files: async () => {
      return [await scanPdf(`scan-${size}mb.pdf`, scanPages(size)), await scanPdf(`scan-${size}mb-b.pdf`, scanPages(size), 1000)]
    },
  })),
  ...steps([25, 50, 95]).map((size) => ({
    tool: 'nen-pdf',
    size: `1 tệp scan ~${size} MB (${scanPages(size)} trang)`,
    files: async () => [await scanPdf(`scan-${size}mb.pdf`, scanPages(size))],
  })),
  ...steps([5, 10, 20]).map((n) => ({ tool: 'ocr-van-ban', size: `${n} ảnh chữ`, files: () => copies(FIX + 'anh-van-ban.jpg', n, 'chu') })),
  ...steps([50, 200, 500]).map((n) => ({
    tool: 'pdf-sang-word',
    size: `${n} trang → ảnh JPG`,
    files: async () => [n === 500 ? FIX + 'ho-so-500-trang.pdf' : await slicePdf(`ho-so-${n}-trang.pdf`, n)],
    before: (page) => page.getByRole('radio', { name: /Ảnh JPG/ }).check(),
  })),
  ...steps([50, 200, 500]).map((n) => ({
    tool: 'pdf-sang-word',
    size: `${n} trang → Word`,
    files: async () => [n === 500 ? FIX + 'ho-so-500-trang.pdf' : await slicePdf(`ho-so-${n}-trang.pdf`, n)],
    before: (page) => page.getByRole('radio', { name: /Word/ }).check(),
  })),
  ...steps([20, 100, 300]).map((n) => ({
    tool: 'pdf-sang-word',
    size: `${n} trang bảng → Excel`,
    files: async () => [await tablePdf(`bang-ke-${n}-trang.pdf`, n)],
    before: (page) => page.getByRole('radio', { name: /Excel/ }).check(),
  })),
  ...steps([5, 20, 50]).map((n) => ({
    tool: 'ocr-van-ban',
    size: `PDF scan ${n} trang → PDF tìm được chữ`,
    files: async () => [await scanPdf(`scan-${n}-trang.pdf`, n)],
  })),
].filter((item) => (!only || only.includes(item.tool)) && (!match || match.test(item.size)))

// ---------- Bộ nhớ tiến trình ----------

/** Một PowerShell sống suốt lượt chạy: nhận danh sách pid, trả tổng bộ nhớ riêng. Mỗi lần đo không phải spawn lại. */
function rssProbe() {
  if (process.platform !== 'win32') return { read: async () => null, stop: () => {} }
  const shell = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', "while (($l = [Console]::In.ReadLine()) -ne $null) { $s = 0; foreach ($p in Get-Process -Id ($l -split ',') -ErrorAction SilentlyContinue) { $s += $p.PrivateMemorySize64 }; [Console]::Out.WriteLine($s) }"], { stdio: ['pipe', 'pipe', 'ignore'] })
  let waiting = null
  let buffer = ''
  shell.stdout.on('data', (chunk) => {
    buffer += chunk
    const end = buffer.indexOf('\n')
    if (end < 0 || !waiting) return
    waiting(Number(buffer.slice(0, end).trim()) || 0)
    waiting = null
    buffer = ''
  })
  return {
    read: (pids) => (waiting || pids.length === 0 ? Promise.resolve(null) : new Promise((resolve) => ((waiting = resolve), shell.stdin.write(pids.join(',') + '\n')))),
    stop: () => shell.kill(),
  }
}

// ---------- Một ca ----------

async function runCase(item, probe) {
  const files = await item.files()
  const inputBytes = files.reduce((sum, file) => sum + fs.statSync(file).size, 0)
  const row = { tool: item.tool, size: item.size, files: files.length, inputMb: mb(inputBytes) }

  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-precise-memory-info'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, serviceWorkers: 'block' })
  const page = await context.newPage()
  page.on('dialog', (dialog) => void dialog.accept())
  let crashed = false
  page.on('crash', () => (crashed = true))
  const errors = []
  page.on('pageerror', (error) => errors.push(String(error).slice(0, 160)))

  const cdp = await context.newCDPSession(page)
  const system = await browser.newBrowserCDPSession()
  await cdp.send('Performance.enable')
  if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
  let heapPeak = 0
  let rssPeak = 0
  let rssNow = 0
  let sampling = false
  const sampler = setInterval(async () => {
    if (sampling) return
    sampling = true
    try {
      const { metrics } = await cdp.send('Performance.getMetrics')
      heapPeak = Math.max(heapPeak, metrics.find((metric) => metric.name === 'JSHeapUsedSize').value)
      const { processInfo } = await system.send('SystemInfo.getProcessInfo')
      const rss = await probe.read(processInfo.filter((info) => info.type !== 'browser').map((info) => info.id))
      if (rss) rssPeak = Math.max(rssPeak, (rssNow = rss))
    } catch {
      // tab chết hoặc đang đóng — bỏ lượt đo này
    }
    sampling = false
  }, 500)

  try {
    await page.goto(`${HUB}/${item.tool}`)
    await page.locator('.erp-flow-picker').first().waitFor({ timeout: 30000 })

    await page.waitForTimeout(1500)
    row.idleMb = rssNow ? Math.round(rssNow / 1048576) : null
    const loadStarted = Date.now()
    await page.locator('.erp-flow-picker input[type=file]').setInputFiles(files)
    // Đủ tệp, hoặc có tệp bị từ chối và danh sách đứng yên — không chờ mãi một tệp sẽ không bao giờ vào.
    await page.waitForFunction((count) => document.querySelectorAll('.erp-flow-file').length >= count || document.querySelector('.erp-flow-rejected'), files.length, { timeout: 600000, polling: 250 })
    row.loadS = Math.round((Date.now() - loadStarted) / 100) / 10
    await page.waitForTimeout(1000)
    row.accepted = await page.locator('.erp-flow-file').count()
    if (await page.locator('.erp-flow-rejected').count()) row.rejected = (await page.locator('.erp-flow-rejected').first().innerText()).replace(/\s+/g, ' ').slice(0, 200)
    if (row.accepted === 0) return Object.assign(row, { status: 'rejected' })

    if (item.before) await item.before(page)
    const runStarted = Date.now()
    await page.locator('.erp-flow__run').click()
    // Nhánh thua cuộc sẽ hết giờ sau khi ca đã xong — nuốt lỗi đó, không để thành unhandled rejection.
    const wait = (selector, name) => page.locator(selector).first().waitFor({ timeout: RUN_TIMEOUT }).then(() => name, () => (crashed ? 'crashed' : 'timeout'))
    const outcome = await Promise.race([wait('.erp-flow-result', 'done'), wait('.erp-flow-error', 'error'), new Promise((resolve) => page.once('crash', () => resolve('crashed')))])
    row.runS = Math.round((Date.now() - runStarted) / 100) / 10
    row.status = outcome
    if (outcome === 'error') row.detail = (await page.locator('.erp-flow-error').first().innerText()).replace(/\s+/g, ' ').slice(0, 200)
    if (outcome !== 'done') return row

    row.title = (await page.locator('.erp-flow-result__title').first().innerText()).replace(/\s+/g, ' ')
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.getByRole('button', { name: 'Tải về' }).click()])
    const saved = OUT + 'out-' + download.suggestedFilename()
    await download.saveAs(saved)
    row.output = download.suggestedFilename().split('.').pop()
    row.outputMb = mb(fs.statSync(saved).size)
    fs.rmSync(saved)
    return row
  } catch (error) {
    return Object.assign(row, { status: crashed ? 'crashed' : 'failed', detail: String(error).split('\n')[0].slice(0, 200) })
  } finally {
    clearInterval(sampler)
    row.heapMb = Math.round(heapPeak / 1048576)
    row.memMb = rssPeak ? Math.round(rssPeak / 1048576) : null
    if (errors.length > 0) row.errors = errors.slice(0, 3)
    await browser.close().catch(() => {})
  }
}

// ---------- Chạy ----------

const probe = rssProbe()
const rows = []
for (const item of CASES) {
  const row = await runCase(item, probe)
  rows.push(row)
  console.log(JSON.stringify(row))
}
probe.stop()

const cell = (value) => (value === undefined || value === null ? '—' : String(value))
const table = [
  '| Công cụ | Ca | Vào (MB) | Nạp (s) | Chạy (s) | Ra (MB) | JS heap đỉnh (MB) | Bộ nhớ lúc nghỉ → đỉnh (MB) | Kết quả |',
  '| --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ...rows.map((row) => `| \`${row.tool}\` | ${row.size} | ${cell(row.inputMb)} | ${cell(row.loadS)} | ${cell(row.runS)} | ${cell(row.outputMb)} | ${cell(row.heapMb)} | ${cell(row.idleMb)} → ${cell(row.memMb)} | ${row.status}${row.detail || row.rejected ? ` — ${row.detail ?? row.rejected}` : ''} |`),
].join('\n')
const report = { base: HUB, quick, cpu, photoMb: mb(photoBytes), scanPageMb: mb(scanBytes), rows }
fs.writeFileSync(OUT + 'report.json', JSON.stringify(report, null, 2))
fs.writeFileSync(OUT + 'report.md', table + '\n')
console.log('\n' + table)
console.log(`\nBáo cáo: ${OUT}report.{json,md}`)
