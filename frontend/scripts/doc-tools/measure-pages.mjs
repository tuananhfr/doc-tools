// Đo cùng một kịch bản cho 500 và 1000 trang: CASE=500|1000, CPU=1|4 (hệ số làm chậm CPU, giả máy yếu).
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const { PDFDocument } = createRequire(import.meta.url)('pdf-lib')
const OUT = outDir('measure-pages')
const count = Number(process.env.CASE ?? 1000)
const cpu = Number(process.env.CPU ?? 1)

const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-precise-memory-info'] })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true, serviceWorkers: 'block' })
const page = await context.newPage()
const cdp = await context.newCDPSession(page)
await cdp.send('Performance.enable')
let peak = 0
const heap = async () => {
  const { metrics } = await cdp.send('Performance.getMetrics')
  const mb = Math.round(metrics.find((m) => m.name === 'JSHeapUsedSize').value / 1048576)
  peak = Math.max(peak, mb)
  return mb
}
const sampler = setInterval(() => void heap().catch(() => {}), 250)
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(BASE)
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
if (cpu > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpu })
const out = { count, cpu, heapStart: await heap() }
const cards = page.locator('.erp-doc-page')

// Thời gian từ cú bấm tới khung hình đầu tiên SAU khi điều kiện đúng — gần với độ trễ người dùng thấy.
async function timed(action, until) {
  const t = Date.now()
  await action()
  await page.waitForFunction(until, null, { timeout: 600000, polling: 16 })
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())))
  return Date.now() - t
}

{
  const t = Date.now()
  await page.locator('input[type=file]').first().setInputFiles([FIX + `ho-so-${count}-trang.pdf`])
  await page.waitForFunction(() => { const i = document.querySelector('.erp-doc-page img'); return i && i.complete && i.naturalWidth > 0 }, null, { timeout: 300000 })
  out.ttfp = Date.now() - t
  await cards.nth(count - 1).waitFor({ state: 'attached', timeout: 300000 })
  out.allCards = Date.now() - t
  out.domNodes = await page.evaluate(() => document.getElementsByTagName('*').length)
  out.heapLoaded = await heap()
}

{
  const t = Date.now()
  await cards.nth(count - 1).scrollIntoViewIfNeeded()
  await page.waitForFunction(() => { const c = document.querySelectorAll('.erp-doc-page'); const i = c[c.length - 1]?.querySelector('img'); return i && i.complete && i.naturalWidth > 0 }, null, { timeout: 300000 })
  out.lastThumb = Date.now() - t
  await page.evaluate(() => scrollTo(0, 0))
}

// Thao tác trên cả lưới: chọn tất cả rồi xoay — mỗi lần là một lượt render lại mọi thẻ.
out.selectAll = await timed(
  () => page.getByRole('button', { name: 'Chọn tất cả' }).first().click(),
  () => document.querySelectorAll('.erp-doc-page.is-selected').length === document.querySelectorAll('.erp-doc-page').length,
)
out.rotateAll = await timed(
  () => page.getByRole('button', { name: 'Xoay phải' }).first().click(),
  () => document.querySelectorAll('.erp-doc-page__rotation').length === document.querySelectorAll('.erp-doc-page').length,
)
out.undo = await timed(() => page.keyboard.press('Control+z'), () => document.querySelectorAll('.erp-doc-page__rotation').length === 0)

await page.getByRole('tab', { name: 'Tìm' }).click()
out.search = await timed(
  () => page.getByRole('searchbox', { name: 'Tìm trong tài liệu' }).fill('trang'),
  () => /kết quả|Không tìm thấy/.test(document.querySelector('.erp-doc-search__status')?.textContent ?? ''),
)
out.searchStatus = (await page.locator('.erp-doc-search__status').innerText()).replace(/\s+/g, ' ').slice(0, 90)
out.heapSearched = await heap()

await page.getByRole('tab', { name: 'Xuất tệp' }).click()
for (const [tag, name] of [['pdf', /^Tải PDF/], ['word', 'Tải Word']]) {
  const t = Date.now()
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 900000 }), page.getByRole('button', { name }).click()])
  const path = OUT + `${count}-${cpu}x.${tag === 'pdf' ? 'pdf' : 'docx'}`
  await dl.saveAs(path)
  out[tag] = { ms: Date.now() - t, kb: Math.round(fs.statSync(path).size / 1024) }
  if (tag === 'pdf') out.pdf.pages = (await PDFDocument.load(fs.readFileSync(path))).getPageCount()
}
out.heapEnd = await heap()
clearInterval(sampler)
out.heapPeak = peak
out.errors = errors
console.log(JSON.stringify(out))
await browser.close()
