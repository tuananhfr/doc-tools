// SEC01 / CN-013: thả tệp độc vào công cụ thật và kiểm tab KHÔNG treo, KHÔNG sập, và tệp bị TỪ CHỐI
// bằng câu người dùng đọc được (ca `rejected`) hoặc ít nhất xử lý an toàn (ca `safe`).
//
//   node scripts/doc-tools/check-malicious.mjs          cần app ở HUB (mặc định localhost:3002)
//   ONLY=docx-bomb,docx-lie / MAX_GAP_MS=3000 / WAIT_MS=30000
//
// TỰ ĐÁNH TRƯỢT: mã thoát 1 khi có ca hỏng. "Treo" đo bằng nhịp tim 100 ms chạy trên luồng chính —
// worker làm việc nặng thì nhịp đều; parser chạy trên luồng chính thì có khoảng lặng dài.
import fs from 'node:fs'
import path from 'node:path'
import { chromium, FIX, HUB, mockFreeSession, outDir } from './lib/qa.mjs'

const MAX_GAP_MS = Number(process.env.MAX_GAP_MS ?? 3000)
const WAIT_MS = Number(process.env.WAIT_MS ?? 30000)
/** Ca `safe` không chờ câu báo lỗi: cho công cụ 10 s xử lý rồi đo. */
const SAFE_SETTLE_MS = 10000
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const OUT = outDir('check-malicious')

const CASES = [
  { id: 'pdf-empty', slug: 'ghep-pdf', file: 'rong.pdf', expect: 'rejected' },
  { id: 'pdf-fake', slug: 'ghep-pdf', file: 'gia-mao.pdf', expect: 'rejected' },
  { id: 'pdf-truncated', slug: 'ghep-pdf', file: 'cut-doi.pdf', expect: 'safe' },
  { id: 'pdf-deep', slug: 'ghep-pdf', file: 'long-sau.pdf', expect: 'safe' },
  { id: 'pdf-stream-bomb', slug: 'xem-pdf', file: 'bom-luong.pdf', expect: 'safe' },
  { id: 'pdf-image-bomb', slug: 'xem-pdf', file: 'bom-anh.pdf', expect: 'safe' },
  { id: 'image-100mp-png', slug: 'nen-anh', file: 'anh-100mp.png', expect: 'rejected' },
  { id: 'image-100mp-jpg', slug: 'nen-anh', file: 'anh-100mp.jpg', expect: 'rejected' },
  { id: 'image-huge-header', slug: 'nen-anh', file: 'anh-khong-lo.png', expect: 'rejected' },
  { id: 'image-broken', slug: 'nen-anh', file: 'anh-hong.jpg', expect: 'rejected' },
  { id: 'image-fake', slug: 'nen-anh', file: 'gia-mao-anh.png', expect: 'rejected' },
  { id: 'docx-bomb', slug: 'doc-to-van-ban', file: 'bom-nen.docx', expect: 'rejected', tab: 'Tệp' },
  { id: 'docx-lie', slug: 'doc-to-van-ban', file: 'khai-gian.docx', expect: 'rejected', tab: 'Tệp' },
  { id: 'txt-binary', slug: 'doc-to-van-ban', file: 'nhi-phan.txt', expect: 'safe', tab: 'Tệp' },
  // Màn hoá đơn XML báo lỗi ở `.erp-tool-result__note`, không có role=alert.
  { id: 'xml-entities', slug: 'doc-hoa-don-xml', file: 'bom-thuc-the.xml', expect: 'rejected', note: true },
]

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const withTimeout = (promise, ms) => Promise.race([promise, sleep(ms).then(() => { throw new Error('timeout') })])

async function messages(page, note) {
  const selector = '[role=alert], .erp-flow-rejected' + (note ? ', .erp-tool-result__note' : '')
  return page.locator(selector).evaluateAll((items) => items.map((item) => item.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean))
}

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const results = []
for (const item of CASES) {
  if (only && !only.includes(item.id)) continue
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 }, serviceWorkers: 'block' })
  await mockFreeSession(context)
  const page = await context.newPage()
  let crashed = false
  page.on('crash', () => { crashed = true })
  page.on('dialog', (dialog) => void dialog.accept())
  await page.addInitScript(() => {
    window.__beats = []
    setInterval(() => window.__beats.push(performance.now()), 100)
  })
  const result = { id: item.id, slug: item.slug, file: item.file, expect: item.expect, ok: false, crashed: false, maxGapMs: null, message: null, error: null }
  try {
    if (!fs.existsSync(FIX + item.file)) throw new Error(`thiếu tệp mẫu ${item.file} — chạy make-fixtures.mjs`)
    await page.goto(`${HUB}/${item.slug}`)
    // WP4-A vẽ thẻ nhập bằng ToolSegments: nút aria-pressed trong role=group, không phải role=tab.
    if (item.tab) await page.getByRole('group', { name: 'Cách đưa nội dung vào' }).getByRole('button', { name: item.tab, exact: true }).click({ timeout: 30000 })
    const input = page.locator('input[type=file]').first()
    await input.waitFor({ state: 'attached', timeout: 30000 })
    const before = await messages(page, item.note)
    const droppedAt = await page.evaluate(() => performance.now())
    const started = Date.now()
    await input.setInputFiles(FIX + item.file)
    let fresh = []
    let frozen = false
    while (Date.now() - started < WAIT_MS && !crashed) {
      const now = await withTimeout(messages(page, item.note), MAX_GAP_MS * 2).catch(() => null)
      if (now === null) { frozen = true; break }
      fresh = now.filter((text) => !before.includes(text))
      if (fresh.length) break
      if (item.expect === 'safe' && Date.now() - started > SAFE_SETTLE_MS) break
      await sleep(250)
    }
    result.crashed = crashed
    result.maxGapMs = frozen || crashed ? null : await withTimeout(page.evaluate((at) => {
      const beats = window.__beats.filter((beat) => beat >= at)
      let gap = 0
      for (let index = 1; index < beats.length; index++) gap = Math.max(gap, beats[index] - beats[index - 1])
      return Math.round(gap)
    }, droppedAt), 5000).catch(() => null)
    result.message = fresh[0] ?? null
    const responsive = !crashed && result.maxGapMs !== null && result.maxGapMs <= MAX_GAP_MS
    result.ok = responsive && (item.expect !== 'rejected' || fresh.length > 0)
    await page.screenshot({ path: path.join(OUT, `${item.id}.png`) }).catch(() => {})
  } catch (error) {
    result.error = String(error).split('\n')[0].slice(0, 200)
  }
  results.push(result)
  await context.close().catch(() => {})
}
await browser.close()

const failed = results.filter((item) => !item.ok).map((item) => item.id)
const report = { maxGapMs: MAX_GAP_MS, waitMs: WAIT_MS, cases: results, failed }
fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(report, null, 2), 'utf8')
console.log(JSON.stringify({ ran: results.length, failed }))
if (failed.length) process.exit(1)
