// FEED01 / CN-012 (spec v3 §10): trang công cụ có điểm Góp ý gọn ở chân trang, khách gửi được không cần
// đăng nhập, và request góp ý chỉ mang chữ người dùng gõ — tệp đang mở trong công cụ không bao giờ đi kèm.
// Mọi `/api/v1` bị chặn bằng phản hồi giả (POST /contributions trả DEDUPED để thấy cả câu báo gộp).
//
//   SITE=http://localhost:3002 node scripts/doc-tools/check-feedback.mjs
//   WIDTHS=390 THEMES=light node scripts/doc-tools/check-feedback.mjs
import fs from 'node:fs'
import { chromium, outDir } from './lib/qa.mjs'

const site = (process.env.SITE ?? 'http://localhost:3002').replace(/\/$/, '')
const widths = (process.env.WIDTHS ?? '360,390,768,1366').split(',').map(Number)
const themes = (process.env.THEMES ?? 'light,dark').split(',')
const TOOL = '/nen-anh'
const FILE_NAME = 'qa-feedback-private.png'
// PNG 1x1 hợp lệ: đủ để công cụ nhận tệp, đủ nhỏ để không làm chậm lượt chạy.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
const KEYS = ['attribution', 'baseSnapshotId', 'domain', 'jurisdiction', 'proposedChanges', 'sourceRefs', 'toolId']
const out = outDir(process.env.OUT_NAME ?? 'wp5-feedback')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const rows = []
const failures = []

for (const theme of themes) {
  for (const width of widths) {
    const mobile = width < 768
    const context = await browser.newContext({ viewport: { width, height: 844 }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 })
    await context.addInitScript((t) => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme: t }, version: 0 })), theme)
    const sent = []
    await context.route('**/api/v1/**', (route) => {
      const request = route.request()
      if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/api/v1/contributions')) {
        sent.push({ headers: request.headers(), body: request.postData() ?? '' })
        return route.fulfill({ json: { ok: true, receiptCode: 'Q'.repeat(32), status: 'DEDUPED', tracked: false } })
      }
      return route.fulfill({ json: { ok: true, user: null, plan: { pro: false, endsAt: null }, capabilities: ['tool.use'], staff: null, total: 0, tools: {} } })
    })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(String(error).slice(0, 200)))
    page.on('dialog', (dialog) => dialog.accept())
    const row = { theme, width }
    try {
      await page.goto(site + TOOL, { waitUntil: 'networkidle', timeout: 60000 })
      const footer = page.locator('.cn-tool-footer')
      await footer.waitFor({ state: 'attached', timeout: 15000 })
      await footer.scrollIntoViewIfNeeded()
      row.footerLinks = await footer.locator('a').evaluateAll((links) => links.map((link) => new URL(link.href).pathname))
      row.footerUnder44 = await footer.locator('a').evaluateAll((links) => links.filter((link) => link.getBoundingClientRect().height < 44).length)
      row.siteFooter = await page.locator('.cn-footer').count()
      await page.screenshot({ path: `${out}${theme}-${width}-footer.png` })
      // Người dùng đã mở tệp trong công cụ rồi mới góp ý.
      const picker = page.locator('input[type="file"]').first()
      row.fileAttached = (await picker.count()) > 0
      if (row.fileAttached) await picker.setInputFiles({ name: FILE_NAME, mimeType: 'image/png', buffer: PNG })
      await page.locator('.cn-tool-feedback__trigger').click()
      const panel = page.locator('.cn-tool-feedback__panel')
      const radios = panel.locator('.cn-community-category input[type="radio"]')
      row.categories = await radios.count()
      await radios.nth(2).check()
      row.toolHint = await panel.locator('.cn-community-tool-hint').isVisible()
      await panel.locator('input[maxlength="100"]').fill('Cần công cụ ghép ảnh dọc')
      await panel.locator('textarea').fill('Ghép nhiều ảnh chụp màn hình thành một ảnh dài.')
      await panel.locator('.cn-community-consent input').check()
      await panel.locator('button[type="submit"]').click()
      await panel.locator('.cn-community-success').waitFor({ timeout: 10000 })
      row.dedupedNote = await panel.locator('.cn-community-deduped').isVisible()
      await page.screenshot({ path: `${out}${theme}-${width}-sent.png` })
      const request = sent[0]
      const body = request ? JSON.parse(request.body) : {}
      row.request = request ? {
        count: sent.length, contentType: request.headers['content-type'], keys: Object.keys(body).sort(),
        domain: body.domain, toolId: body.toolId, attribution: body.attribution, sources: body.sourceRefs.length,
        bytes: request.body.length, mentionsFile: request.body.includes(FILE_NAME) || /data:|base64/i.test(request.body),
        keyLength: (request.headers['idempotency-key'] ?? '').length,
      } : null
    } catch (error) { row.error = String(error).slice(0, 300) }
    row.errors = errors
    const r = row.request
    const ok = !row.error && !errors.length && row.siteFooter === 0 && row.footerUnder44 === 0 && row.fileAttached
      && JSON.stringify(row.footerLinks) === JSON.stringify(['/gop-y-quy-dinh', '/de-xuat-tien-ich'])
      && row.categories === 4 && row.toolHint && row.dedupedNote
      && Boolean(r) && r.count === 1 && r.contentType === 'application/json' && JSON.stringify(r.keys) === JSON.stringify(KEYS)
      && r.domain === 'ideas' && r.toolId === 'de-xuat-tien-ich' && r.attribution === false && r.sources === 0
      && !r.mentionsFile && r.bytes < 2048 && r.keyLength === 32
    if (!ok) failures.push(`${theme}-${width}`)
    rows.push(row)
    await context.close()
  }
}
await browser.close()
const result = { site, tool: TOOL, pass: failures.length === 0, failures, rows }
fs.writeFileSync(`${out}result.json`, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ pass: result.pass, failures, checked: rows.length }))
process.exit(result.pass ? 0 : 1)
