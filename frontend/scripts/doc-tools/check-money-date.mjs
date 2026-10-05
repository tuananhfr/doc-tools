// "Tính tiền & thuế", "Tính ngày & thời hạn" và mã QR danh thiếp (vCard).
// Danh thiếp đi MỘT VÒNG: tạo -> tải PNG -> màn "Đọc QR" đọc lại đúng chuỗi vCard.
//
//   THEME=dark VIEW=360x800 ONLY=money,date,vcard node scripts/doc-tools/check-money-date.mjs
import { chromium, outDir, HUB } from './lib/qa.mjs'

const OUT = outDir('money-date')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const want = (name) => !only || only.includes(name)

let stage = 'init'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] })
const page = await context.newPage()
page.on('console', (m) => m.type() === 'error' && errors.push(`${stage}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => errors.push(`${stage}: ${String(e)}`))

const out = { theme, vw }
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, fullPage: true })
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
const clipboard = async () => (await page.evaluate(() => navigator.clipboard.readText())).replaceAll('\r\n', '\n')
const field = (label) => page.getByLabel(label, { exact: true })
const texts = (selector) => page.locator(selector).allInnerTexts()
const text = async (selector) => ((await page.locator(selector).count()) ? (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ').trim() : null)
const rows = () => page.locator('.erp-tool-row').evaluateAll((items) => items.map((item) => item.innerText.replace(/\s*\n\s*/g, ' | ').trim()))
const result = async () => ({ label: await text('.erp-tool-result__label'), value: await text('.erp-tool-result__value'), notes: await texts('.erp-tool-result__note'), rows: await rows() })
/** Chiều cao nhỏ nhất của các nút / ô bấm được — vùng chạm. */
const touch = () => page.locator('.erp-tool-tab, .erp-flow__main select, .erp-flow__main input:not([type=checkbox])').evaluateAll((items) => Math.min(...items.map((item) => Math.round(item.getBoundingClientRect().height))))

async function open(slug, ready) {
  stage = slug
  await page.goto(`${HUB}/${slug}`)
  await page.evaluate((t) => {
    const raw = localStorage.getItem('erpcons.app')
    const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    data.state.theme = t
    localStorage.setItem('erpcons.app', JSON.stringify(data))
  }, theme)
  await page.reload()
  await page.locator(ready).first().waitFor({ timeout: 30000 })
  await page.waitForTimeout(400)
  return { title: await page.title(), heading: await text('.erp-tool-crumb__title'), privacy: await text('.erp-tool-crumb__privacy') }
}

if (want('money')) {
  const o = (out.money = await open('tinh-tien', '.erp-tool-result'))
  o.groups = await texts('.erp-tool-tab')
  o.empty = await result()
  await shot('money-empty')

  await field('Tỷ lệ').fill('8')
  await field('Của số').fill('1.500.000')
  o.percentOf = await result()

  await page.getByRole('button', { name: 'Thuế & chiết khấu' }).click()
  o.taxPresets = await field('Phép tính').locator('option').allInnerTexts()
  // Thuế suất không có sẵn: chỉ nhập giá thì chưa ra kết quả.
  await field('Giá chưa thuế').fill('150.000')
  o.taxNoRate = { rate: await field('Thuế suất').inputValue(), ...(await result()) }
  await field('Thuế suất').fill('8')
  o.vatAdd = await result()
  await page.getByRole('button', { name: 'Chép kết quả' }).click()
  o.copied = await clipboard()
  await shot('money-vat')
  await field('Thuế suất').fill('tám')
  o.invalid = { ...(await result()), marked: await field('Thuế suất').evaluate((el) => el.classList.contains('is-invalid')) }

  await field('Phép tính').selectOption('vat-extract')
  await field('Giá đã gồm thuế').fill('1.100.000')
  await field('Thuế suất').fill('10')
  o.vatExtract = await result()
  await field('Phép tính').selectOption('discount')
  await field('Giá gốc').fill('2.000.000')
  await field('Chiết khấu').fill('120')
  o.discountOver = await result()
  await field('Chiết khấu').fill('15')
  o.discount = await result()

  await page.getByRole('button', { name: 'Lãi gộp' }).click()
  await field('Giá vốn').fill('80.000')
  await field('Giá bán').fill('100.000')
  o.margin = await result()
  await shot('money-margin')
  await field('Phép tính').selectOption('price-from-margin')
  await field('Giá vốn').fill('80.000')
  await field('Margin mong muốn').fill('20')
  o.fromMargin = await result()
  await field('Margin mong muốn').fill('100')
  o.marginFull = await result()
  await field('Phép tính').selectOption('price-from-markup')
  await field('Giá vốn').fill('80.000')
  await field('Markup mong muốn').fill('20')
  o.fromMarkup = await result()

  await page.getByRole('button', { name: 'Chia tiền' }).click()
  await field('Tổng tiền').fill('1.000.000')
  await field('Số người').fill('2,5')
  o.splitWrong = { ...(await result()), marked: await field('Số người').evaluate((el) => el.classList.contains('is-invalid')) }
  await field('Số người').fill('3')
  o.split = await result()
  await field('Phụ phí / tip').fill('10')
  o.splitTip = await result()
  await shot('money-split')

  // Đổi nhóm rồi quay lại: số đã gõ còn nguyên.
  await page.getByRole('button', { name: 'Phần trăm' }).click()
  o.keptAfterSwitch = await field('Của số').inputValue()
  o.touch = await touch()
  o.overflow = await overflow()
}

if (want('date')) {
  const o = (out.date = await open('tinh-ngay', '.erp-tool-result'))
  o.modes = await texts('.erp-tool-tab')
  o.todayPrefilled = /^\d{4}-\d{2}-\d{2}$/.test(await field('Từ ngày').inputValue())
  o.empty = await result()
  await shot('date-empty')

  await field('Từ ngày').fill('2026-10-05')
  await field('Đến ngày').fill('2026-10-09')
  o.monFri = await result()
  await field('Tính cả ngày bắt đầu').check()
  o.monFriInclusive = await result()
  await field('Tính cả ngày bắt đầu').uncheck()
  await field('Từ ngày').fill('2026-10-01')
  await field('Đến ngày').fill('2026-10-31')
  o.october = await result()
  await page.getByRole('button', { name: 'Chép số ngày' }).click()
  o.copied = await clipboard()
  await shot('date-between')
  await field('Đến ngày').fill('2026-09-01')
  o.reversed = await result()
  o.hints = await texts('.erp-flow__main .erp-flow-field__hint')

  await page.getByRole('button', { name: 'Cộng / trừ ngày' }).click()
  await field('Ngày bắt đầu').fill('2026-10-02')
  o.addEmpty = await result()
  await field('Số ngày').fill('1')
  o.plusOne = await result()
  await field('Loại ngày').selectOption('workday')
  o.plusOneWorkday = await result()
  await field('Số ngày').fill('10')
  o.plusTenWorkdays = await result()
  await page.getByRole('button', { name: 'Chép ngày' }).click()
  o.copiedDate = await clipboard()
  await shot('date-add')
  await field('Hướng').selectOption('back')
  o.minusTenWorkdays = await result()
  await field('Số ngày').fill('2,5')
  o.wrongCount = { ...(await result()), marked: await field('Số ngày').evaluate((el) => el.classList.contains('is-invalid')) }
  o.touch = await touch()
  o.overflow = await overflow()
}

if (want('vcard')) {
  const o = (out.vcard = await open('tao-ma-qr', '.erp-qr-preview'))
  const png = page.getByRole('button', { name: 'Tải mã QR' })
  await field('Loại mã').selectOption('vcard')
  o.empty = { error: await text('.erp-tool-form__error'), pngDisabled: await png.isDisabled() }
  await field('Số điện thoại').fill('0912 345 678')
  o.noName = { error: await text('.erp-tool-form__error'), pngDisabled: await png.isDisabled() }
  await field('Họ tên').fill('Nguyễn Văn An')
  await field('Email liên hệ').fill('an@lpc')
  o.badEmail = await text('.erp-tool-form__error')
  await field('Email liên hệ').fill('an@lpc.vn')
  await field('Công ty (không bắt buộc)').fill('LPC; Chi nhánh 2')
  await field('Chức danh (không bắt buộc)').fill('Chỉ huy trưởng')
  o.error = await text('.erp-tool-form__error')
  o.payload = await page.locator('.erp-qr-payload').first().innerText()
  await shot('qr-vcard')
  const [download] = await Promise.all([page.waitForEvent('download'), png.click()])
  o.name = download.suggestedFilename()
  const file = await download.path()
  o.overflow = await overflow()

  await open('doc-ma-qr', '.erp-flow-picker')
  await page.locator('.erp-flow-picker input[type=file]').setInputFiles([file])
  await page.locator('.erp-scan-hit').first().waitFor({ timeout: 30000 })
  o.readBack = (await page.locator('.erp-scan-hit__text').first().innerText()).replaceAll('\r\n', '\n')
  await shot('qr-vcard-read')
}

await browser.close()
console.log(JSON.stringify({ ...out, errors }, null, 1))
if (errors.length) process.exitCode = 1
