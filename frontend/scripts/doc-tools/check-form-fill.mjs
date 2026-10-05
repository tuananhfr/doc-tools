import fs from 'node:fs'
import { inspect } from './lib/inspect-pdf.mjs'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'


const OUT = outDir('form-fill')
const TAG = process.env.TAG ?? 'run'
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, acceptDownloads: true, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1 })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
const checks = {}

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles(['ho-so-form.pdf', 'co-annot.pdf'].map((name) => FIX + name))
await page.locator('.erp-doc-page').nth(4).waitFor()
await page.waitForTimeout(1200)
const shot = (name, target = page) => target.screenshot({ path: `${OUT}${TAG}-${theme}-${vw}-${name}.png` })
const panel = page.locator('.erp-doc-export')
const formTab = page.getByRole('tab', { name: /Điền form/ })
checks.tabVisible = await formTab.isVisible()
await formTab.scrollIntoViewIfNeeded()
await formTab.click()
await page.getByLabel('don_vi').waitFor()
await panel.scrollIntoViewIfNeeded()
await shot('panel')

const unit = 'Công ty TNHH Xây dựng Hoà Bình — Chi nhánh Đà Nẵng'
await page.getByLabel('don_vi').fill(unit)
await page.getByLabel('ghi_chu').fill('Thanh toán đợt 2\nKèm biên bản nghiệm thu khối lượng')
await page.getByLabel('da_ky_nhay').uncheck()
await page.getByLabel('dot_thanh_toan').selectOption('Đợt 3')
await page.getByLabel('tien_mat').check()
checks.badge = await formTab.innerText()
checks.applyLabel = await page.getByRole('button', { name: /Áp dụng/ }).innerText()
await shot('dirty')

await page.getByRole('button', { name: /Áp dụng/ }).click()
await page.getByText(/Đã điền 5 trường/).waitFor({ timeout: 15000 })
await page.waitForTimeout(1200)
checks.afterApply = { badge: await formTab.innerText(), unit: await page.getByLabel('don_vi').inputValue() }
await shot('applied')

// Hoàn tác: ô quay về giá trị cũ của tệp; làm lại: về giá trị đã điền.
await page.locator('body').click({ position: { x: 5, y: 5 } })
await page.keyboard.press('Control+z')
await page.waitForTimeout(800)
checks.undo = await page.getByLabel('don_vi').inputValue()
await page.keyboard.press('Control+y')
await page.waitForTimeout(800)
checks.redo = await page.getByLabel('don_vi').inputValue()

await page.getByRole('button', { name: 'Xem to trang 1' }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1200)
await shot('preview-p1')
await page.keyboard.press('Escape')
await page.waitForTimeout(300)

await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const pdfPath = `${OUT}${TAG}-${theme}-${vw}-export.pdf`
await download.saveAs(pdfPath)
const report = await inspect(fs.readFileSync(pdfPath))
checks.exported = report.fields

// Khoá form: tab biến mất, tệp xuất không còn trường nào.
await formTab.click()
await page.getByLabel('Khoá form sau khi điền (in phẳng)').check()
await page.getByRole('button', { name: 'Khoá form' }).click()
await page.getByText(/Đã khoá form/).waitFor({ timeout: 15000 })
await page.waitForTimeout(800)
checks.tabAfterFlatten = await formTab.count()
checks.activeTab = await page.locator('.erp-doc-export__tabs .nav-link.active').innerText()
const [flatDownload] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Tải PDF/ }).click()])
const flatPath = `${OUT}${TAG}-${theme}-${vw}-flat.pdf`
await flatDownload.saveAs(flatPath)
checks.flat = (await inspect(fs.readFileSync(flatPath))).fields.length

// Nạp lại bản đã điền (chưa khoá): giá trị đọc lại đúng trong tab Điền form.
await page.getByRole('button', { name: /Làm lại từ đầu/ }).first().click()
const confirm = page.getByRole('button', { name: 'Gỡ hết' })
if (await confirm.count()) await confirm.first().click()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 5000 })
await page.locator('input[type=file]').first().setInputFiles([pdfPath, flatPath])
await page.locator('.erp-doc-page').nth(9).waitFor()
await page.waitForTimeout(1200)
await formTab.click()
await page.getByLabel('don_vi').waitFor()
checks.reimport = { unit: await page.getByLabel('don_vi').inputValue(), fileGroups: await page.locator('.erp-doc-form .erp-doc-export__title').count() }
await page.getByRole('button', { name: 'Xem to trang 6' }).click()
await page.locator('.erp-doc-preview__canvas canvas').waitFor()
await page.waitForTimeout(1200)
await shot('reimport-flat-p6')
await page.keyboard.press('Escape')

console.log(JSON.stringify({ theme, vw, checks, expectUnit: unit, errors }, null, 1))
await browser.close()
