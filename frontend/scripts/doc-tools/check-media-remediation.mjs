import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium, outDir, mockFreeSession } from './lib/qa.mjs'

const site = process.env.SITE ?? 'http://localhost:3002'
const out = outDir('media-tools')
const fixture = path.resolve('qa-output/2026-10-11-mobile-ux/final-checks/qa-motion-audio.webm')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, acceptDownloads: true })
await mockFreeSession(context)
const page = await context.newPage()
const report = { build: null, cases: [], errors: [], limitations: ['Short synthetic video with audio; phone memory and compression quality not measured'] }
page.on('pageerror', error => report.errors.push(String(error)))
try {
  await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  for (const [id, slug, label, format] of [['compress-video', 'nen-video', 'Nén video', 'mp4'], ['trim-video', 'cat-video', 'Cắt video', 'mp4'], ['video-gif', 'tao-gif', 'Tạo GIF', 'gif'], ['extract-audio', 'tach-am-thanh', 'Tách âm thanh', 'mp3']]) {
    const row = { id, status: 'running' }; report.cases.push(row)
    try {
      await page.goto(`${site}/${slug}`, { waitUntil: 'networkidle' })
      await page.locator('input[type=file]').setInputFiles(fixture)
      if (id === 'trim-video' || id === 'video-gif') await page.locator('input:visible:not([type=file])').nth(1).fill('1')
      await page.locator('button:visible').filter({ hasText: label }).last().click()
      const button = page.getByRole('button', { name: 'Tải kết quả', exact: true })
      await button.waitFor({ timeout: 90000 })
      const pending = page.waitForEvent('download')
      await button.click()
      const file = await pending; row.filename = file.suggestedFilename()
      const target = path.join(out, row.filename); await file.saveAs(target)
      const bytes = fs.readFileSync(target); row.bytes = bytes.length; row.signature = bytes.subarray(0, 16).toString('hex')
      assert(bytes.length > 100)
      assert(row.filename.endsWith('.' + format))
      if (format === 'mp4') assert.equal(bytes.subarray(4, 8).toString(), 'ftyp')
      if (format === 'gif') assert.equal(bytes.subarray(0, 3).toString(), 'GIF')
      if (format === 'mp3') assert(bytes.subarray(0, 3).toString() === 'ID3' || bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)
      row.status = 'passed'
    } catch (error) { row.status = 'failed'; row.error = String(error) }
    await page.locator('.erp-tools-guest').evaluate(element => { element.scrollTop = element.scrollHeight })
    row.screenshot = `${id}.png`
    await page.screenshot({ path: path.join(out, row.screenshot) })
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2), 'utf8')
    console.log(JSON.stringify(row))
  }
} finally {
  report.status = report.cases.length === 4 && report.cases.every(row => row.status === 'passed') && !report.errors.length ? 'passed' : 'failed'
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2), 'utf8')
  await browser.close()
}
if (report.status !== 'passed') process.exitCode = 1
