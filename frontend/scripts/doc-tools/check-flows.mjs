// Luồng ba bước của các công cụ nhanh "Chuyện Nhỏ": chọn tệp -> chạy -> kết quả.
// Mỗi công cụ được chạy THẬT rồi mở tệp tải về ra soi (số trang, số tệp trong .zip, chữ đọc được).
// FULL=1: thêm bước đã đăng nhập (API giả) ở nhánh trong app `/tools` — tải xong không mời đăng nhập.
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, FIX, outDir, HUB, APP_HUB, mockSession } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument } = appRequire('pdf-lib')
const { unzipSync } = appRequire('fflate')
const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs')

const OUT = outDir('flows')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const full = process.env.FULL === '1'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
// "Sửa tiếp" để lại trình chỉnh sửa đang giữ tệp; bước sau `goto` sang công cụ khác là trình duyệt hỏi lại.
page.on('dialog', (dialog) => dialog.accept())
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, fullPage: true })
const out = { theme, vw }

const files = () => page.locator('.erp-flow-file')
const names = () => page.locator('.erp-flow-file__name').allInnerTexts()
const runButton = () => page.locator('.erp-flow__run')
const result = () => page.locator('.erp-flow-result')
const notes = () => page.locator('.erp-flow-note').allInnerTexts()
const pageCount = async (path) => (await PDFDocument.load(fs.readFileSync(path))).getPageCount()
const zipNames = (path) => Object.keys(unzipSync(fs.readFileSync(path)))

async function open(slug, hub = HUB) {
  await page.goto(`${hub}/${slug}`)
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

async function add(list, expected) {
  await page.locator('.erp-flow-picker input[type=file]').setInputFiles(list.map((name) => FIX + name))
  if (expected > 0) await files().nth(expected - 1).waitFor({ timeout: 60000 })
  await page.waitForTimeout(500)
}

/** OCR v2 dừng ở bước soát chữ trước khi có kết quả: xác nhận nguyên giá trị máy đọc rồi xuất. Công cụ khác đi thẳng. */
async function settle(timeout) {
  await page.locator('.cn-ocr-review, .erp-flow-result').first().waitFor({ timeout })
  if (await page.locator('.cn-ocr-review').count()) {
    for (let n = 0; await page.locator('.cn-ocr-review__word.needs-review').count(); n++) {
      if (n > 500) throw new Error('bước soát OCR không kết thúc')
      await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click()
    }
    await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click()
  }
  await result().waitFor({ timeout })
}

async function run(timeout = 180000) {
  await runButton().click()
  await settle(timeout)
  return { title: await page.locator('.erp-flow-result__title').innerText(), file: await page.locator('.erp-flow-result__file-name').innerText(), meta: await page.locator('.erp-flow-result__file-meta').innerText(), notes: await notes() }
}

async function download(name) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Tải về' }).click()])
  const path = OUT + `${theme}-${vw}-${name}`
  await dl.saveAs(path)
  return { path, suggested: dl.suggestedFilename() }
}

async function textOf(path) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path)), useSystemFonts: false, verbosity: 0 }).promise
  let text = ''
  for (let n = 1; n <= doc.numPages; n++) text += (await (await doc.getPage(n)).getTextContent()).items.map((item) => item.str).join(' ') + '\n'
  return text
}

const moreButtons = () => page.locator('.erp-flow-result__more .btn').allInnerTexts()

// 1. Ghép PDF — chặn khi mới 1 tệp, đổi thứ tự, kết quả đủ trang, Làm lại giữ tệp, Sửa tiếp sang trình chỉnh sửa.
out.merge = await open('ghep-pdf')
await shot('merge-empty')
out.merge.emptyRun = { disabled: await runButton().isDisabled(), hint: await page.locator('.erp-flow__hint').innerText() }
await add(['hop-dong.pdf'], 1)
out.merge.oneFile = { disabled: await runButton().isDisabled(), hint: await page.locator('.erp-flow__hint').innerText() }
await add(['phu-luc.pdf'], 2)
out.merge.order = await names()
await page.getByRole('button', { name: 'Đưa phu-luc.pdf lên trên' }).click()
out.merge.reordered = await names()
out.merge.runLabel = await runButton().innerText()
await shot('merge-files')
const sum = (await pageCount(FIX + 'hop-dong.pdf')) + (await pageCount(FIX + 'phu-luc.pdf'))
out.merge.result = await run()
out.merge.buttons = await moreButtons()
await shot('merge-result')
const merged = await download('merge.pdf')
out.merge.download = { name: merged.suggested, pages: `${await pageCount(merged.path)}/${sum}` }
// Tệp đầu trong kết quả phải là phu-luc (đã đưa lên trên).
out.merge.firstPageIsAppendix = (await textOf(merged.path)).trimStart().slice(0, 400) === (await textOf(FIX + 'phu-luc.pdf')).trimStart().slice(0, 400)
await page.waitForTimeout(400)
out.merge.guestNudge = await page.locator('.erp-flow-result .erp-doc-nudge').count()
await page.getByRole('button', { name: 'Làm lại' }).click()
await files().nth(1).waitFor()
out.merge.afterRestart = await names()
out.merge.resultAgain = (await run()).title
await page.getByRole('button', { name: 'Sửa tiếp' }).click()
await page.locator('.erp-doc-page').nth(sum - 1).waitFor({ timeout: 60000 })
out.merge.editor = { path: new URL(page.url()).pathname, pages: await page.locator('.erp-doc-page').count() }

// 2. Tách PDF — một tệp mỗi lượt, khoảng trang sai bị chặn, nhiều nhóm ra .zip, một nhóm ra PDF.
out.split = await open('tach-pdf')
await add(['anh-van-ban.jpg'], 0)
out.split.rejected = await page.locator('.erp-flow-rejected').innerText()
// Công cụ làm trên MỘT tệp: chọn tệp mới là thay tệp cũ, không cộng dồn.
await add(['phu-luc.pdf'], 1)
await add(['hop-dong.pdf'], 1)
out.split.kept = await names()
out.split.rejectedAfterGoodFile = await page.locator('.erp-flow-rejected').count()
const splitPages = await pageCount(FIX + 'hop-dong.pdf')
const ranges = page.getByRole('textbox', { name: 'Khoảng trang' })
out.split.emptyHint = await page.locator('.erp-flow__hint').innerText()
await ranges.fill(`1-${splitPages + 5}`)
out.split.badRange = { disabled: await runButton().isDisabled(), hint: await page.locator('.erp-flow__hint').innerText(), invalid: await ranges.getAttribute('class') }
await ranges.fill(`1, 2-${splitPages}`)
out.split.runLabel = await runButton().innerText()
await shot('split-options')
out.split.result = await run()
const splitZip = await download('split.zip')
out.split.zip = zipNames(splitZip.path)
await page.getByRole('button', { name: 'Làm lại' }).click()
await ranges.fill('2')
out.split.singleLabel = await runButton().innerText()
out.split.single = await run()
const single = await download('split-single.pdf')
out.split.singlePages = await pageCount(single.path)
await page.getByRole('button', { name: 'Làm lại' }).click()
await page.getByRole('radio', { name: /Mỗi N trang/ }).check()
const every = page.getByRole('spinbutton', { name: 'Số trang mỗi tệp' })
await every.fill('1')
out.split.everyLabel = await runButton().innerText()
await every.fill(String(splitPages))
out.split.everyTooBig = await page.locator('.erp-flow__hint').innerText()
await every.fill('1')
out.split.every = (await run()).meta
out.split.everyZip = zipNames((await download('split-every.zip')).path).length

// 3. Nén PDF — báo đúng dung lượng trước/sau; tệp toàn chữ phải nói thật là không nhẹ hơn.
out.compress = await open('nen-pdf')
await add(['ho-so-scan.pdf'], 1)
out.compress.scan = await run(300000)
const compressed = await download('compress.pdf')
out.compress.bytes = `${fs.statSync(FIX + 'ho-so-scan.pdf').size} -> ${fs.statSync(compressed.path).size}`
out.compress.pages = `${await pageCount(compressed.path)}/${await pageCount(FIX + 'ho-so-scan.pdf')}`
await shot('compress-result')
await page.getByRole('button', { name: 'Làm lại' }).click()
await page.getByRole('button', { name: 'Bỏ ho-so-scan.pdf' }).click()
await add(['hop-dong.pdf', 'phu-luc.pdf'], 2)
out.compress.textOnly = await run()
out.compress.batchZip = zipNames((await download('compress-batch.zip')).path)

// 4. Chuyển đổi file — Word, ảnh từng trang, nhiều tệp ra .zip.
out.convert = await open('pdf-sang-word')
await add(['hop-dong.pdf'], 1)
out.convert.word = await run()
out.convert.wordButtons = await moreButtons()
const docx = await download('convert.docx')
out.convert.docx = { name: docx.suggested, bytes: fs.statSync(docx.path).size, isZip: fs.readFileSync(docx.path).subarray(0, 2).toString() === 'PK' }
await page.getByRole('button', { name: 'Làm lại' }).click()
await page.getByRole('radio', { name: /Ảnh JPG/ }).check()
await page.getByLabel('Độ phân giải').selectOption('96')
await shot('convert-options')
out.convert.image = await run()
out.convert.imageZip = zipNames((await download('convert-images.zip')).path).length
await page.getByRole('button', { name: 'Làm lại' }).click()
await add(['bang-ke.pdf'], 2)
await page.getByRole('radio', { name: /Excel/ }).check()
out.convert.batch = await run()
out.convert.batchZip = zipNames((await download('convert-batch.zip')).path)

// 5. Ảnh -> Văn bản — chữ hiện ngay trên màn kết quả; PDF bị từ chối.
out.imageText = await open('anh-sang-van-ban')
await add(['hop-dong.pdf'], 0)
out.imageText.rejected = await page.locator('.erp-flow-rejected').innerText()
await add(['anh-van-ban.jpg'], 1)
await runButton().click()
await page.locator('.erp-flow-progress').waitFor({ timeout: 10000 })
out.imageText.progress = await page.locator('.erp-flow-progress__text').innerText()
await settle(300000)
out.imageText.result = { title: await page.locator('.erp-flow-result__title').innerText(), file: await page.locator('.erp-flow-result__file-name').innerText(), notes: await notes() }
const recognized = await page.locator('.erp-flow-result__text-body').inputValue()
out.imageText.text = { chars: recognized.length, lines: recognized.split('\n').length, head: recognized.slice(0, 120) }
out.imageText.buttons = await moreButtons()
await shot('image-text-result')
const txt = await download('image-text.txt')
out.imageText.download = { name: txt.suggested, same: fs.readFileSync(txt.path, 'utf8') === recognized }

// 6. OCR văn bản — huỷ giữa chừng về lại bước chọn tệp, không báo lỗi; PDF ra tìm được chữ.
out.ocr = await open('ocr-van-ban')
await add(['anh-van-ban.jpg', 'anh-hien-truong.jpg'], 2)
await runButton().click()
await page.locator('.erp-flow-progress').waitFor({ timeout: 10000 })
await page.getByRole('button', { name: 'Huỷ' }).click()
await runButton().waitFor({ timeout: 30000 })
out.ocr.afterCancel = { files: await files().count(), error: await page.locator('.erp-flow-error').count(), result: await result().count() }
await page.getByRole('button', { name: 'Bỏ anh-hien-truong.jpg' }).click()
out.ocr.pdf = await run(300000)
out.ocr.buttons = await moreButtons()
const searchable = await download('ocr.pdf')
const ocrText = await textOf(searchable.path)
out.ocr.download = { pages: await pageCount(searchable.path), chars: ocrText.trim().length, sameWords: recognized.split(/\s+/).filter((word) => word.length > 3 && ocrText.includes(word)).length }

// 7. Scan ảnh -> PDF — mỗi ảnh một trang, khổ giấy đổi theo tuỳ chọn.
out.images = await open('anh-sang-pdf')
await add(['anh-hien-truong.jpg', 'anh-van-ban.jpg'], 2)
await page.getByLabel('Khổ giấy').selectOption('a3')
await page.getByLabel('Lề', { exact: true }).selectOption('10')
await shot('images-options')
out.images.result = await run()
const album = await download('images.pdf')
const albumDoc = await PDFDocument.load(fs.readFileSync(album.path))
out.images.pages = albumDoc.getPageCount()
out.images.sizes = albumDoc.getPages().map((item) => `${Math.round(item.getWidth())}x${Math.round(item.getHeight())}`)

// 8. Tệp có mật khẩu: hỏi mật khẩu rồi mới vào danh sách.
await open('nen-pdf')
await add(['mat-khau.pdf'], 0)
const dialog = page.getByRole('dialog')
await dialog.waitFor({ timeout: 20000 })
await dialog.getByLabel('Mật khẩu', { exact: true }).fill('Mật-khẩu-2026')
await dialog.getByRole('button', { name: /Mở khoá/ }).click()
await files().first().waitFor({ timeout: 30000 })
out.password = await names()

// 9. Đã đăng nhập, nhánh trong app (`/tools`): luồng nằm trong khung app, tải xong không mời
//    đăng nhập, "Sửa tiếp" ở lại nhánh đó.
if (full) {
  await mockSession(page)
  await open('ghep-pdf', APP_HUB)
  await add(['hop-dong.pdf', 'phu-luc.pdf'], 2)
  await run()
  await download('authed.pdf')
  await page.waitForTimeout(600)
  out.authed = { path: new URL(page.url()).pathname, shell: await page.locator('.erp-shell .erp-flow-result').count(), nudge: await page.locator('.erp-doc-nudge').count() }
  await shot('authed-result')
  await page.getByRole('button', { name: 'Sửa tiếp' }).click()
  await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
  out.authed.editFurther = { path: new URL(page.url()).pathname, shell: await page.locator('.erp-shell .erp-doc-tools').count() }
}

out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
