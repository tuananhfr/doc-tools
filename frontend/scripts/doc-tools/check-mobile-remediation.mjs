import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { PDFDocument } from 'pdf-lib'
import { chromium, FIX, outDir } from './lib/qa.mjs'
import { buildToolCatalog } from '../export-tool-catalog.mjs'

const site = process.env.SITE ?? 'http://localhost:37061'
const mode = process.env.MODE ?? 'journeys'
const height = Number(process.env.HEIGHT ?? 844)
const widths = (process.env.WIDTHS ?? (mode === 'sweep' ? '320,360,390,430,768,1366,1920' : '320,390,430')).split(',').map(Number)
const out = outDir(process.env.OUT_NAME ?? `remediation-${mode}-${widths.join('-')}${height === 844 ? '' : '-h' + height}`)
const catalog = await buildToolCatalog()
const messages = Object.fromEntries(['site', 'documents', 'pdf', 'image', 'finance', 'vietnam', 'common'].map(namespace => [namespace, JSON.parse(fs.readFileSync(new URL(`../../src/i18n/messages/vi/${namespace}.json`, import.meta.url), 'utf8'))]))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const report = { mode, target: site, build: null, createdAt: new Date().toISOString(), reviewStatus: 'draft', checks: [], errors: [], limitations: ['Synthetic fixtures and emulated viewports', 'Account, Pro and signed-rule APIs mocked', 'OCR processing and handwriting deferred; common OCR screen layout checked only', 'Physical devices and real-user task time not measured'] }
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2), 'utf8')

async function capture(page, name) {
  await page.waitForTimeout(120)
  const geometry = await page.evaluate(() => {
    const owner = document.querySelector('.erp-tools-guest')
    const toolbar = document.querySelector('.erp-doc-toolbar')
    return { rootOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth, ownerOverflow: owner ? owner.scrollWidth - owner.clientWidth : 0, toolbarHeight: toolbar?.getBoundingClientRect().height ?? null, scrollTop: owner?.scrollTop ?? null }
  })
  assert(geometry.rootOverflow <= 2 && geometry.ownerOverflow <= 2, `Horizontal overflow ${name}: ${JSON.stringify(geometry)}`)
  const file = `${name}.png`
  await page.screenshot({ path: path.join(out, file), animations: 'disabled' })
  return { screenshot: file, ...geometry }
}

async function check(page, id, run) {
  const row = { id, width: page.viewportSize().width, status: 'running' }
  report.checks.push(row)
  try { Object.assign(row, await run()); row.status = 'passed' }
  catch (error) { row.status = 'failed'; row.error = String(error); await page.screenshot({ path: path.join(out, `${row.width}-${id}-failed.png`) }).catch(() => {}) }
  save()
  console.log(JSON.stringify({ id, width: row.width, status: row.status, error: row.error }))
}

async function download(page, button, name) {
  const pending = page.waitForEvent('download', { timeout: 90000 })
  await button.click()
  const file = await pending
  const destination = path.join(out, name)
  await file.saveAs(destination)
  return fs.readFileSync(destination)
}

try {
  for (const width of widths) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 768, hasTouch: width < 768, acceptDownloads: true })
    await context.route('**/api/v1/**', route => route.fulfill({ json: { ok: true, user: null, plan: { pro: false, endsAt: null }, capabilities: ['tool.use'], staff: null, total: 0, tools: {} } }))
    const page = await context.newPage()
    page.setDefaultTimeout(15000)
    page.on('dialog', dialog => void dialog.accept())
    page.on('pageerror', error => { report.errors.push({ width, url: page.url(), error: String(error) }); save() })
    const open = slug => page.goto(`${site}/${slug}`, { waitUntil: 'networkidle' })
    await open('cong-cu')
    const build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
    assert(!report.build || report.build === build, 'Build changed during QA')
    report.build = build
    if (mode === 'sweep') {
      const selected = process.env.ONLY?.split(',')
      const pages = [{ id: 'directory', slug: 'cong-cu' }, { id: 'home', slug: '' }, ...catalog.tools.filter(tool => tool.status === 'ready')].filter(tool => !selected || selected.includes(tool.id))
      for (const tool of pages) await check(page, tool.id, async () => {
        await open(tool.slug)
        await page.locator('main').waitFor()
        await page.evaluate(() => document.fonts.ready)
        return { slug: tool.slug, ...await capture(page, `${width}-${tool.id}-initial`) }
      })
      await context.close()
      continue
    }

    await check(page, 'directory-and-return', async () => {
      await open('cong-cu')
      assert.equal(await page.locator('a.erp-tool-card').count(), 68)
      assert.equal(await page.locator('.erp-tool-card.is-soon').count(), 0)
      await page.locator('.cn-catalog-availability input').check()
      assert.equal(await page.locator('.erp-tool-card.is-soon').count(), 19)
      await page.locator('.cn-catalog-availability input').uncheck()
      await page.locator('.cn-filter-mobile').selectOption('document')
      await page.locator('#tim-cong-cu').fill('ghép pdf')
      await page.locator('a.erp-tool-card').first().click()
      await page.waitForURL('**/ghep-pdf')
      await page.locator('.erp-tool-crumb__back').click()
      await page.waitForURL('**/cong-cu?**')
      assert.equal(await page.locator('#tim-cong-cu').inputValue(), 'ghép pdf')
      assert.equal(await page.locator('.cn-filter-mobile').inputValue(), 'document')
      await open('cong-cu')
      await page.locator('a.erp-tool-card').nth(20).scrollIntoViewIfNeeded()
      const before = await page.locator('.erp-tools-guest').evaluate(element => element.scrollTop)
      await page.locator('a.erp-tool-card').nth(20).click()
      await page.locator('.erp-tool-crumb__back').click()
      await page.waitForTimeout(250)
      const after = await page.locator('.erp-tools-guest').evaluate(element => element.scrollTop)
      assert(Math.abs(before - after) < 8, `Scroll was ${before}, restored ${after}`)
      return { before, after, ...await capture(page, `${width}-directory-return`) }
    })

    await check(page, 'mobile-menu', async () => {
      await open('tao-ma-qr')
      await page.getByRole('button', { name: messages.site.header.openMenu, exact: true }).click()
      await page.locator('#cn-mobile-navigation .erp-tools-prefs').waitFor()
      const screenshot = await capture(page, `${width}-menu`)
      await page.locator('#cn-mobile-navigation .btn-close').click()
      return screenshot
    })

    await check(page, 'qr-output-first', async () => {
      await open('tao-ma-qr')
      await page.locator('input[type=url]').fill('https://example.com/menu?mobile=1')
      const result = await page.locator('.erp-flow__side').boundingBox()
      const options = await page.locator('.erp-flow__after').boundingBox()
      assert(result.y < options.y)
      const bytes = await download(page, page.getByRole('button', { name: 'Tải mã QR', exact: true }), `${width}-qr.png`)
      assert(bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])))
      return { outputBytes: bytes.length, ...await capture(page, `${width}-qr-result`) }
    })

    await check(page, 'receipt-validation-preview-print', async () => {
      await open('mau-don')
      await page.getByLabel(messages.documents.formTemplates.kind).selectOption('receipt')
      for (const [key, value] of Object.entries({ sender: 'Nguyễn Văn Kiểm thử', receiver: 'Trần Thị Kiểm thử', receivedDate: '11/10/2026', purpose: 'Thanh toán thử nghiệm' })) await page.getByLabel(messages.documents.formTemplates.fields[key], { exact: true }).fill(value)
      await page.getByLabel(messages.documents.formTemplates.fields.amount, { exact: true }).fill('1,5')
      assert(await page.getByRole('button', { name: messages.documents.shared.print, exact: true }).isDisabled())
      await page.getByLabel(messages.documents.formTemplates.fields.amount, { exact: true }).fill('2.500.000')
      assert(await page.getByRole('button', { name: messages.documents.shared.print, exact: true }).isEnabled())
      await page.getByRole('tab', { name: 'Xem trước', exact: true }).click()
      await page.locator('.cn-responsive-preview__output').getByText('Hai triệu năm trăm nghìn', { exact: false }).waitFor()
      const screenshot = await capture(page, `${width}-receipt-preview`)
      const file = path.join(out, `${width}-receipt.pdf`)
      await page.pdf({ path: file, format: 'A4', printBackground: true })
      const pdf = await PDFDocument.load(fs.readFileSync(file))
      assert.equal(pdf.getPageCount(), 1)
      await page.getByRole('tab', { name: 'Nhập thông tin', exact: true }).click()
      assert.equal(await page.getByLabel(messages.documents.formTemplates.fields.amount, { exact: true }).inputValue(), '2.500.000')
      await page.locator('.erp-tool-crumb__back').click()
      await page.getByRole('button', { name: messages.common.leave.stay, exact: true }).click()
      assert(page.url().endsWith('/mau-don'))
      return { printedPages: 1, ...screenshot }
    })

    await check(page, 'cv-preview-keeps-draft', async () => {
      await open('tao-cv')
      await page.getByLabel(messages.documents.cv.fields.name, { exact: true }).fill('Nguyễn Văn Kiểm thử')
      await page.getByRole('tab', { name: 'Xem trước', exact: true }).click()
      await page.locator('.cn-responsive-preview__output').getByText('Nguyễn Văn Kiểm thử', { exact: true }).waitFor()
      const screenshot = await capture(page, `${width}-cv-preview`)
      await page.getByRole('tab', { name: 'Nhập thông tin', exact: true }).click()
      assert.equal(await page.getByLabel(messages.documents.cv.fields.name, { exact: true }).inputValue(), 'Nguyễn Văn Kiểm thử')
      await page.waitForTimeout(450)
      await page.reload({ waitUntil: 'networkidle' })
      assert.equal(await page.getByLabel(messages.documents.cv.fields.name, { exact: true }).inputValue(), 'Nguyễn Văn Kiểm thử')
      return screenshot
    })

    await check(page, 'pdf-reader-editor-session', async () => {
      await open('xem-pdf')
      await page.locator('input[type=file]').first().setInputFiles(FIX + 'hop-dong.pdf')
      await page.locator('.cn-pdf-reader__stage canvas').waitFor({ timeout: 60000 })
      const count = await page.locator('.cn-pdf-reader__page option').count()
      assert.equal(await page.locator('.erp-doc-toolbar').count(), 0)
      if (count > 1) await page.locator('.cn-pdf-reader__page select').selectOption('1')
      await page.getByRole('button', { name: messages.pdf.preview.zoomIn, exact: true }).click()
      const reading = await capture(page, `${width}-pdf-reader`)
      await page.getByRole('link', { name: messages.pdf.reader.edit, exact: true }).click()
      await page.waitForURL('**/chinh-sua-pdf')
      assert.equal(await page.locator('.erp-doc-page').count(), count)
      const editing = await capture(page, `${width}-pdf-editor`)
      assert(editing.toolbarHeight < 170, `Toolbar height ${editing.toolbarHeight}`)
      await page.locator('.erp-doc-page__select').first().click()
      await page.getByRole('button', { name: 'Tùy chọn thêm', exact: true }).click()
      const expanded = await capture(page, `${width}-pdf-editor-menu`)
      assert(expanded.toolbarHeight < height - 100, `Expanded toolbar height ${expanded.toolbarHeight}`)
      await page.locator('.erp-doc-toolbar__actions').getByRole('button', { name: messages.pdf.toolbar.duplicate, exact: true }).click()
      assert.equal(await page.locator('.erp-doc-page').count(), count + 1)
      await page.locator('.erp-doc-toolbar__primary').getByRole('button', { name: messages.pdf.toolbar.undo, exact: true }).click()
      assert.equal(await page.locator('.erp-doc-page').count(), count)
      return { pages: count, reading, editing, expanded }
    })

    await check(page, 'electricity-structured-free-result', async () => {
      await open('tien-dien')
      await page.getByLabel(messages.finance.electricity.kwh, { exact: true }).fill('20')
      await page.getByLabel(messages.finance.electricity.table.price, { exact: true }).fill('2.000')
      await page.getByLabel('Áp dụng cho phần còn lại', { exact: true }).check()
      await page.locator('.erp-tool-result__value').getByText('40.000', { exact: false }).waitFor()
      const result = await page.locator('.erp-flow__side').boundingBox()
      const pro = await page.locator('.erp-flow__after').boundingBox()
      assert(result.y < pro.y)
      return await capture(page, `${width}-electricity`)
    })

    await check(page, 'address-structured-mapping', async () => {
      await open('doi-dia-chi')
      await page.getByText(messages.vietnam.address.manualTitle, { exact: true }).first().click()
      const values = { oldProvince: 'Tỉnh QA', oldDistrict: 'Huyện QA', oldWard: 'Xã QA', newProvince: 'Tỉnh QA mới', newWard: 'Phường QA mới' }
      for (const [key, value] of Object.entries(values)) await page.getByLabel(messages.vietnam.address.mappingFields[key], { exact: true }).fill(value)
      await page.getByLabel(messages.vietnam.address.addressesLabel, { exact: true }).fill('12 Đường QA, Xã QA, Huyện QA, Tỉnh QA')
      await page.locator('tbody td').filter({ hasText: 'Phường QA mới' }).waitFor()
      await page.getByLabel('Nhập dạng văn bản', { exact: true }).check()
      assert((await page.getByLabel(messages.vietnam.address.manualTitle, { exact: true }).inputValue()).includes('Tỉnh QA|Huyện QA|Xã QA'))
      await page.getByLabel('Nhập dạng văn bản', { exact: true }).uncheck()
      assert.equal(await page.getByLabel(messages.vietnam.address.mappingFields.oldWard, { exact: true }).inputValue(), 'Xã QA')
      const result = await page.locator('.erp-flow__side').boundingBox()
      const pro = await page.locator('.erp-flow__after').boundingBox()
      assert(result.y < pro.y)
      return await capture(page, `${width}-address`)
    })

    await check(page, 'payroll-free-before-pro', async () => {
      await open('luong')
      const result = await page.locator('.erp-flow__side').boundingBox()
      const pro = await page.locator('.erp-flow__after').boundingBox()
      assert(result.y < pro.y)
      await page.getByLabel(messages.finance.payroll.grossSalary, { exact: true }).fill('25.000.000')
      await page.locator('summary').filter({ hasText: 'Tùy chọn thêm' }).click()
      await page.getByLabel(messages.finance.payroll.insuranceBase, { exact: true }).fill('20.000.000')
      await page.locator('summary').filter({ hasText: 'Tùy chọn thêm' }).click()
      await page.locator('summary').filter({ hasText: 'Tùy chọn thêm' }).click()
      assert.equal(await page.getByLabel(messages.finance.payroll.insuranceBase, { exact: true }).inputValue(), '20.000.000')
      return await capture(page, `${width}-payroll`)
    })

    for (const [id, slug] of [['page-numbers', 'danh-so-trang'], ['stamp', 'dong-dau-pdf'], ['sign', 'ky-tai-lieu'], ['id-photo', 'anh-the']]) await check(page, id + '-preview-controls', async () => {
      await open(slug)
      await page.locator('input[type=file]').first().setInputFiles(FIX + (id === 'id-photo' ? 'anh-hien-truong.jpg' : 'hop-dong.pdf'))
      await page.locator('.cn-flow-switch').waitFor({ timeout: 60000 })
      await page.locator('.cn-flow-switch').getByRole('button', { name: 'Xem trước', exact: true }).click()
      await page.locator('.erp-flow__stage canvas').first().waitFor({ timeout: 60000 })
      const screenshot = await capture(page, `${width}-${id}-preview`)
      await page.locator('.cn-flow-switch').getByRole('button', { name: 'Nhập thông tin', exact: true }).click()
      assert(await page.locator('.erp-flow__side').isVisible())
      return screenshot
    })

    for (const theme of ['dark', 'field']) await check(page, 'theme-' + theme, async () => {
      await open('tao-ma-qr')
      await page.evaluate(theme => { const raw = JSON.parse(localStorage.getItem('erpcons.app') ?? '{"state":{},"version":0}'); raw.state.theme = theme; localStorage.setItem('erpcons.app', JSON.stringify(raw)) }, theme)
      await page.reload({ waitUntil: 'networkidle' })
      await page.locator('input[type=url]').fill('https://example.com/theme')
      return await capture(page, `${width}-${theme}`)
    })
    await context.close()
  }
} catch (error) {
  report.fatalError = String(error)
  throw error
} finally {
  report.status = report.checks.length > 0 && !report.fatalError && report.checks.every(check => check.status === 'passed') && !report.errors.length ? 'passed' : 'failed'
  save()
  await browser.close()
}
if (report.status !== 'passed') process.exitCode = 1
