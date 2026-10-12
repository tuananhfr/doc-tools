// Kiểm WP3 (spec v3 UI03/UI04, v2 CN-005/006/007/008/016): chọn mẫu bằng thumbnail không mất dữ liệu,
// tải xong vẫn sửa và tải bản khác, chuyển ảnh giữa công cụ. Cần `npm run dev` (cổng 3002) và
// `node scripts/doc-tools/make-fixtures.mjs`. API bị mock — không gì gửi tới backend.
//   node scripts/doc-tools/check-workspace.mjs              THEME=dark · SKIP_AI=1 (bỏ bước xoá nền, chạy CPU chậm)
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { chromium, FIX, HUB, outDir, mockFreeSession } from './lib/qa.mjs'

const { PDFDocument } = createRequire(import.meta.url)('pdf-lib')
const OUT = outDir('workspace')
const theme = process.env.THEME ?? 'light'
const photo = FIX + 'anh-hien-truong.jpg'
const eight = Array.from({ length: 8 }, (_, index) => { const file = path.join(OUT, `anh-${index + 1}.jpg`); fs.copyFileSync(photo, file); return file })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const out = {}
const failures = []
const errors = []
const check = (name, ok) => { if (!ok) failures.push(name) }

async function open(route, width = 1366, height = 900) {
  const mobile = width < 768
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
  await context.addInitScript((value) => localStorage.setItem('erpcons.app', JSON.stringify({ state: { theme: value }, version: 0 })), theme)
  await mockFreeSession(context)
  const page = await context.newPage()
  const state = { dialogs: 0 }
  page.on('pageerror', (error) => errors.push(`${route}: ${error.message}`))
  page.on('dialog', (dialog) => { state.dialogs++; void dialog.accept() })
  await page.goto(HUB + route, { waitUntil: 'networkidle', timeout: 60000 })
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  return { page, context, state }
}

async function saveDownload(page, click) {
  const [file] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), click()])
  const target = path.join(OUT, file.suggestedFilename())
  await file.saveAs(target)
  return fs.readFileSync(target)
}

const enabled = (locator) => locator.evaluate((element) => new Promise((resolve) => { const tick = () => (element.disabled ? setTimeout(tick, 100) : resolve(true)); tick() }))
async function leaveIfAsked(page) {
  const leave = page.getByRole('button', { name: 'Rời trang' })
  if (await leave.waitFor({ timeout: 2000 }).then(() => true, () => false)) await leave.click()
}

// CN-005: 8 ảnh, thử 4 bố cục trên mobile — 1 lần chọn ảnh, 1 chạm mỗi lần thử, xem trước đổi ngay.
{
  const { page, context } = await open('/ghep-anh', 390, 844)
  await page.getByRole('button', { name: 'Nhiều bố cục, logo & ZIP' }).click()
  await page.getByLabel('Chọn ảnh (tối đa 100)').setInputFiles(eight)
  await page.getByRole('tab', { name: 'Xem trước' }).click()
  const group = page.getByRole('group', { name: 'Bố cục' })
  await page.waitForFunction(() => document.querySelectorAll('.cn-template-picker__thumb img').length >= 6, null, { timeout: 120000 })
  const main = '.cn-graphic-preview img'
  await page.locator(main).waitFor({ timeout: 60000 })
  let changed = 0, taps = 0
  for (const index of [1, 2, 3, 4]) {
    const before = await page.locator(main).getAttribute('src')
    await group.getByRole('button').nth(index).click(); taps++
    await page.waitForFunction(([selector, old]) => { const image = document.querySelector(selector); return Boolean(image && image.getAttribute('src') && image.getAttribute('src') !== old) }, [main, before], { timeout: 60000 })
    if (await group.getByRole('button').nth(index).getAttribute('aria-pressed') === 'true') changed++
  }
  out.collage = { uploads: 1, layouts: await group.getByRole('button').count(), thumbnails: await page.locator('.cn-template-picker__thumb img').count(), tries: 4, previewChanged: changed, tapsPerTry: taps / 4 }
  check('collage', out.collage.layouts === 6 && out.collage.thumbnails === 6 && changed === 4 && out.collage.tapsPerTry === 1)
  await page.screenshot({ path: path.join(OUT, `${theme}-390-ghep-anh-picker.png`) })
  await context.close()
}

// Ảnh khai 300 MP: xem trước báo lỗi, thumbnail lùi về chỉ có tên, trang không văng.
{
  const { page, context } = await open('/ghep-anh')
  const before = errors.length
  await page.getByRole('button', { name: 'Nhiều bố cục, logo & ZIP' }).click()
  await page.getByLabel('Chọn ảnh (tối đa 100)').setInputFiles(FIX + 'anh-khong-lo.png')
  const failed = await page.getByText('Chưa dựng được xem trước. Kiểm tra ảnh và kích thước.').first().waitFor({ timeout: 30000 }).then(() => true, () => false)
  await page.waitForTimeout(3000)
  out.hugeImage = { previewFailed: failed, thumbnails: await page.locator('.cn-template-picker__thumb img').count(), pageErrors: errors.length - before }
  check('hugeImage', failed && out.hugeImage.thumbnails === 0 && out.hugeImage.pageErrors === 0)
  await context.close()
}

// UI03 + CN-006 + CN-016: CV đổi 5 mẫu giữ nội dung, tải PDF + DOCX hợp lệ, tải xong đổi mẫu vẫn còn.
{
  const { page, context } = await open('/tao-cv')
  const name = page.getByLabel('Họ và tên', { exact: true })
  await name.fill('Nguyễn Văn An')
  await page.getByLabel('Vị trí ứng tuyển', { exact: true }).fill('Kế toán')
  await page.getByRole('textbox', { name: /^Giới thiệu ngắn/ }).fill('Năm năm kinh nghiệm')
  const group = page.getByRole('group', { name: 'Mẫu CV' })
  const main = page.locator('.cn-responsive-preview__output > article.cn-cv-print')
  let kept = true
  const ids = ['modern', 'compact', 'executive', 'sidebar', 'classic']
  for (const [index, id] of [1, 2, 3, 4, 0].entries()) {
    await group.getByRole('button').nth(id).click()
    kept &&= (await main.getAttribute('class')).includes(`cn-cv--${ids[index]}`) && (await name.inputValue()) === 'Nguyễn Văn An'
  }
  const pdf = await saveDownload(page, () => page.getByRole('button', { name: 'Tải PDF' }).first().click())
  await group.getByRole('button').nth(4).click()
  const docx = await saveDownload(page, () => page.getByRole('button', { name: 'Tải DOCX' }).first().click())
  await group.getByRole('button').nth(1).click()
  out.cv = { templates: await group.getByRole('button').count(), kept, pdf: pdf.subarray(0, 4).toString() === '%PDF', docx: docx.subarray(0, 2).toString() === 'PK' && docx.includes('word/document.xml'), keptAfterDownload: (await name.inputValue()) === 'Nguyễn Văn An' && (await page.getByRole('textbox', { name: /^Giới thiệu ngắn/ }).inputValue()) === 'Năm năm kinh nghiệm' }
  check('cv', out.cv.templates === 5 && kept && out.cv.pdf && out.cv.docx && out.cv.keptAfterDownload)
  await context.close()
}

// UI03: 6 loại giấy tờ bằng thumbnail, không hộp hỏi, quay lại còn nguyên.
{
  const { page, context, state } = await open('/mau-don')
  await page.getByLabel('Họ và tên', { exact: true }).first().fill('Trần Thị Bình')
  const group = page.getByRole('group', { name: 'Loại giấy tờ' })
  for (const label of ['Giấy ủy quyền', 'Biên bản bàn giao', 'Biên nhận tiền', 'Thỏa thuận', 'Hợp đồng lao động', 'Đơn xin nghỉ phép']) await group.getByRole('button', { name: label }).click()
  out.form = { kinds: await group.getByRole('button').count(), dialogs: state.dialogs, kept: (await page.getByLabel('Họ và tên', { exact: true }).first().inputValue()) === 'Trần Thị Bình' }
  check('form', out.form.kinds === 6 && out.form.dialogs === 0 && out.form.kept)
  await context.close()
}

// UI04: thiết kế — xuất, "Làm lại", đổi mẫu, xuất bản thứ hai; nội dung còn nguyên.
{
  const { page, context } = await open('/thiet-ke-nhanh')
  const title = page.getByLabel('Tên / tiêu đề', { exact: true })
  await title.fill('Tiệm Hoa Mai')
  const group = page.getByRole('group', { name: 'Bố cục' })
  await group.getByRole('button', { name: 'Dấu tròn trang trí' }).click()
  const sealNotice = await page.getByText('Dấu tròn này chỉ để trang trí', { exact: false }).first().isVisible()
  const run = page.getByRole('button', { name: 'Xuất thiết kế' }).first()
  await page.locator('.cn-graphic-preview img').waitFor({ timeout: 60000 })
  await enabled(run); await run.click()
  let downloads = (await saveDownload(page, () => page.getByRole('button', { name: 'Tải về' }).click())).length > 0 ? 1 : 0
  const keepsHint = await page.getByText('Nội dung và tùy chọn vẫn được giữ', { exact: false }).isVisible()
  await page.getByRole('button', { name: 'Làm lại' }).click()
  const keptAfterRestart = (await title.inputValue()) === 'Tiệm Hoa Mai'
  await group.getByRole('button', { name: 'Thiệp / thẻ quà tặng' }).click()
  await page.waitForTimeout(600)
  await page.locator('.cn-graphic-preview img').waitFor({ timeout: 60000 })
  await enabled(run); await run.click()
  downloads += (await saveDownload(page, () => page.getByRole('button', { name: 'Tải về' }).click())).length > 0 ? 1 : 0
  out.design = { templates: await page.getByRole('group', { name: 'Bố cục' }).getByRole('button').count().catch(() => 0), downloads, keptAfterRestart, sealNotice, keepsHint }
  check('design', downloads === 2 && keptAfterRestart && sealNotice && keepsHint)
  await context.close()
}

// Handoff: cắt ảnh → ảnh thẻ → CV; xoá nền → ảnh thẻ; PDF nhanh → trình sửa (đường cũ).
{
  out.handoff = {}
  const { page, context } = await open('/cat-chinh-anh')
  await page.locator('input[type=file]').first().setInputFiles(photo)
  await page.getByRole('button', { name: 'Xoay phải' }).click()
  const save = page.getByRole('button', { name: 'Lưu ảnh' }).first()
  await enabled(save); await save.click()
  await page.getByRole('button', { name: 'Làm ảnh thẻ từ ảnh này' }).click()
  await leaveIfAsked(page)
  await page.waitForURL(/\/anh-the$/, { timeout: 30000 })
  out.handoff.cropToIdPhoto = await page.getByLabel('Cỡ ảnh thẻ').first().waitFor({ timeout: 30000 }).then(() => true, () => false)
  await page.getByText('Một ảnh thẻ', { exact: true }).click()
  const make = page.getByRole('button', { name: 'Tạo ảnh thẻ' }).first()
  await enabled(make); await make.click()
  await page.getByRole('button', { name: 'Dùng làm ảnh trong CV' }).click()
  await page.waitForURL(/\/tao-cv$/, { timeout: 30000 })
  out.handoff.idPhotoToCv = await page.locator('.cn-responsive-preview__output > article.cn-cv-print .cn-cv-header img').waitFor({ timeout: 30000 }).then(() => true, () => false)
    && await page.getByText('Đã nhận ảnh chân dung từ công cụ Ảnh thẻ', { exact: false }).isVisible()
  await context.close()

  if (process.env.SKIP_AI === '1') out.handoff.removeBgToIdPhoto = 'skipped'
  else {
    const removal = await open('/xoa-phong')
    await removal.page.locator('input[type=file]').first().setInputFiles(photo)
    const button = removal.page.getByRole('button', { name: 'Làm ảnh thẻ từ ảnh này' })
    await enabled(button); await button.click()
    await removal.page.waitForURL(/\/anh-the$/, { timeout: 180000 })
    out.handoff.removeBgToIdPhoto = await removal.page.getByLabel('Cỡ ảnh thẻ').first().waitFor({ timeout: 30000 }).then(() => true, () => false)
    await removal.context.close()
  }

  const quick = await open('/nen-pdf')
  await quick.page.locator('input[type=file]').first().setInputFiles(FIX + 'hop-dong.pdf')
  const compress = quick.page.getByRole('button', { name: 'Nén PDF', exact: true }).first()
  await enabled(compress); await compress.click()
  await quick.page.getByRole('button', { name: 'Sửa tiếp' }).click()
  await leaveIfAsked(quick.page)
  await quick.page.waitForURL(/\/chinh-sua-pdf$/, { timeout: 30000 })
  out.handoff.pdfQuickToEditor = await quick.page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 }).then(() => true, () => false)
  await quick.context.close()
  check('handoff', out.handoff.cropToIdPhoto && out.handoff.idPhotoToCv && out.handoff.removeBgToIdPhoto !== false && out.handoff.pdfQuickToEditor)
}

// CN-007: một ảnh, hai cỡ trên cùng tờ A4.
{
  const { page, context } = await open('/anh-the')
  await page.getByRole('button', { name: 'Ghép nhiều ảnh và kích cỡ' }).click()
  await page.locator('input[type=file][multiple]').first().setInputFiles(photo)
  const active = page.locator('select[aria-label="Ảnh đang chỉnh"]')
  await active.waitFor({ timeout: 30000 })
  await page.getByRole('button', { name: 'Thêm cỡ khác cho ảnh này' }).click()
  await page.waitForFunction(() => document.querySelectorAll('select[aria-label="Ảnh đang chỉnh"] option').length === 2, null, { timeout: 30000 })
  const labels = await active.locator('option').allTextContents()
  const selectedSecond = (await active.inputValue()) === await active.locator('option').nth(1).getAttribute('value')
  await page.getByLabel('Cỡ ảnh thẻ').first().selectOption('4x6')
  const summary = await page.getByText('4 ảnh trên 1 tờ').waitFor({ timeout: 10000 }).then(() => true, () => false)
  const run = page.getByRole('button', { name: 'Tạo tờ ảnh hỗn hợp' }).first()
  await enabled(run); await run.click()
  const bytes = await saveDownload(page, () => page.getByRole('button', { name: 'Tải về' }).click())
  const pdf = await PDFDocument.load(bytes)
  const [width, height] = [pdf.getPage(0).getWidth(), pdf.getPage(0).getHeight()]
  out.mixed = { items: labels.length, distinctLabels: new Set(labels).size === 2, selectedSecond, summary, pdfPages: pdf.getPageCount(), a4: Math.abs(width - 595.28) < 1 && Math.abs(height - 841.89) < 1 }
  check('mixed', out.mixed.items === 2 && out.mixed.distinctLabels && selectedSecond && summary && out.mixed.pdfPages === 1 && out.mixed.a4)
  await context.close()
}

// Ảnh picker CV trên mobile (pane Xem trước).
{
  const { page, context } = await open('/tao-cv', 390, 844)
  await page.getByRole('tab', { name: 'Xem trước' }).click()
  await page.screenshot({ path: path.join(OUT, `${theme}-390-tao-cv-picker.png`) })
  await context.close()
}

await browser.close()
out.errors = errors
out.failures = failures
console.log(JSON.stringify(out))
process.exit(failures.length || errors.length ? 1 : 0)
