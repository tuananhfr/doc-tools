import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { chromium, outDir, mockFreeSession } from './lib/qa.mjs'

const site = process.env.SITE ?? 'http://localhost:37062', out = outDir('ocr-responsive')
const fixtures = process.env.OCR_FIXTURES
assert(fixtures, 'OCR_FIXTURES must point at the preserved dataset')
const widths = (process.env.WIDTHS ?? '320,360,390,430,768,1366,1920').split(',').map(Number)
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = { createdAt: new Date().toISOString(), target: site, build: null, checks: [], errors: [], limitations: ['Chrome emulated viewports; physical-device performance and soft keyboard unverified', 'Fixture corrections are scripted, not a human usability score'] }
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
let currentPage
async function capture(page, name) {
  await page.evaluate(() => document.fonts.ready)
  const geometry = await page.evaluate(() => {
    const owner = document.querySelector('.erp-tools-guest')
    const controls = [...document.querySelectorAll('.cn-ocr-review button, .cn-ocr-review input, .cn-ocr-review select, .cn-ocr-review summary')].filter(node => node.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true }))
    return { rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, ownerOverflow: owner ? owner.scrollWidth - owner.clientWidth : 0,
      smallControls: controls.filter(node => node.getBoundingClientRect().height < 43 && node.type !== 'checkbox').map(node => ({ tag: node.tagName, className: node.className, height: node.getBoundingClientRect().height })) }
  })
  assert(geometry.rootOverflow <= 2 && geometry.ownerOverflow <= 2, JSON.stringify(geometry))
  assert.equal(geometry.smallControls.length, 0, 'OCR touch controls must be at least 44 px: ' + JSON.stringify(geometry.smallControls))
  await page.screenshot({ path: path.join(out, name + '.png'), animations: 'disabled' })
  return { screenshot: name + '.png', ...geometry }
}
try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height: 844 }, hasTouch: width < 768, acceptDownloads: true })
    await mockFreeSession(context)
    const page = await context.newPage()
    currentPage = page
    page.on('pageerror', error => report.errors.push(String(error)))
    for (const slug of ['anh-sang-van-ban', 'ocr-van-ban']) {
      await page.goto(site + '/' + slug, { waitUntil: 'networkidle' })
      const build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
      assert(!report.build || report.build === build); report.build = build
      if (process.env.EXPECTED_BUILD) assert.equal(build, process.env.EXPECTED_BUILD)
      assert.equal(await page.locator('.cn-ocr-advanced').getAttribute('open'), null)
      assert.equal(await page.locator('.cn-ocr-steps li').count(), 4)
      report.checks.push({ width, slug, state: 'input', ...await capture(page, `${width}-${slug}-input`) })
    }
    for (const [profile, file] of [['printed', 'baseline-v1/RECEIPT-CLEAN.png'], ['table', 'GRID-CLEAN.png']]) {
      await page.goto(site + '/anh-sang-van-ban', { waitUntil: 'networkidle' })
      await page.getByLabel('Loại nội dung', { exact: true }).selectOption(profile)
      await page.locator('input[type=file]').first().setInputFiles(path.join(fixtures, file))
      await page.locator('.erp-flow__run').click(); await page.locator('.cn-ocr-review').waitFor({ timeout: 120000 })
      if (profile === 'table' && width < 768) {
        const inspector = page.locator('.cn-ocr-cell-editor')
        await inspector.locator('canvas').waitFor({ state: 'visible' })
        await page.getByLabel('Ô đang kiểm tra', { exact: true }).selectOption({ label: 'Hàng 3, cột 1' })
        assert.equal(await page.getByLabel('Giá trị ô đang chọn', { exact: true }).inputValue(), '0012')
        await page.getByLabel('Giá trị ô đang chọn', { exact: true }).fill('0013')
        assert.equal(await page.getByLabel('Hàng 3, cột 1', { exact: true }).inputValue(), '0013')
        await page.getByRole('button', { name: 'Ô tiếp', exact: true }).click()
        await page.getByRole('button', { name: 'Ô trước', exact: true }).click()
        assert.equal(await page.getByLabel('Giá trị ô đang chọn', { exact: true }).inputValue(), '0013')
        assert.equal(await page.locator('.cn-ocr-table__full').getAttribute('open'), null)
        await inspector.scrollIntoViewIfNeeded()
      } else {
        if (profile === 'printed') {
          const original = await page.locator('#ocr-word-value').inputValue()
          await page.locator('#ocr-word-value').fill('temporary draft')
          assert(await page.locator('.cn-ocr-review__page select').isDisabled())
          await page.getByRole('button', { name: 'Bỏ thay đổi chưa xác nhận', exact: true }).click()
          assert.equal(await page.locator('#ocr-word-value').inputValue(), original)
          assert(await page.locator('.cn-ocr-review__page select').isEnabled())
        }
        await page.locator(profile === 'table' ? '.cn-ocr-table' : '.cn-ocr-review__editor').scrollIntoViewIfNeeded()
      }
      report.checks.push({ width, profile, state: 'review', ...await capture(page, `${width}-${profile}-review`) })
      if (width === 390) {
        await page.setViewportSize({ width: 390, height: 460 })
        await page.locator(profile === 'table' ? '.cn-ocr-cell-editor' : '.cn-ocr-review__editor').scrollIntoViewIfNeeded()
        report.checks.push({ width, height: 460, profile, state: 'review-short', ...await capture(page, `390-${profile}-short`) })
        await page.setViewportSize({ width, height: 844 })
      }
      await page.locator('.erp-flow-progress__cancel').click()
      await page.locator('.erp-flow__run').waitFor()
    }
    save(); await context.close()
    console.log(JSON.stringify({ width, checks: report.checks.length }))
  }
  assert.equal(report.errors.length, 0)
  report.status = 'passed'
} catch (error) { report.status = 'failed'; report.error = String(error); await currentPage?.screenshot({ path: path.join(out, 'failure.png') }).catch(() => undefined); process.exitCode = 1 }
finally { save(); await browser.close() }
