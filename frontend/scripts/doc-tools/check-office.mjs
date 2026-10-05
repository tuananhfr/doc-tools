import { createRequire } from 'node:module'
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'
import { chromium, FIX, outDir, BASE } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { unzipSync, strFromU8 } = appRequire('fflate')
const ExcelJS = appRequire('exceljs')

const OUT = outDir('office')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const office = process.env.OFFICE === '1'

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 200)))
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto(BASE)
await page.evaluate((t) => {
  const raw = localStorage.getItem('erpcons.app')
  const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
  data.state.theme = t
  localStorage.setItem('erpcons.app', JSON.stringify(data))
}, theme)
await page.reload()
await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
await page.locator('input[type=file]').first().setInputFiles([FIX + 'hop-dong.pdf', FIX + 'bang-ke.pdf', FIX + 'xoay-crop.pdf', FIX + 'anh-hien-truong.jpg'])
await page.locator('.erp-doc-page').nth(16).waitFor({ timeout: 60000 })
await page.waitForTimeout(1200)

const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png` })
const out = { theme, vw }

await page.getByRole('tab', { name: 'Xuất tệp' }).click()
const section = page.getByRole('heading', { name: 'Chuyển sang Word / Excel' })
await page.getByRole('button', { name: 'Tải Excel' }).scrollIntoViewIfNeeded()
await shot('panel')

async function download(click) {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), click()])
  const path = OUT + `${theme}-${vw}-${dl.suggestedFilename()}`
  await dl.saveAs(path)
  return path
}
async function toastAfter(re, action) {
  const loc = page.getByText(re)
  const before = await loc.count()
  const result = await action()
  for (let i = 0; i < 100 && (await loc.count()) <= before; i++) await page.waitForTimeout(100)
  return { result, text: (await loc.count()) > before ? await loc.last().innerText() : null }
}

const word = await toastAfter(/chèn vào Word dạng ảnh/, () => download(() => page.getByRole('button', { name: 'Tải Word' }).click()))
out.wordToast = word.text
const excel = await toastAfter(/để trống trong Excel/, () => download(() => page.getByRole('button', { name: 'Tải Excel' }).click()))
out.excelToast = excel.text
await shot('after')

// docx: đủ section, chữ tiếng Việt, đậm, 1 ảnh (trang ảnh), tab cho dòng bảng.
const files = unzipSync(fs.readFileSync(word.result))
const xml = strFromU8(files['word/document.xml'])
out.docxSections = (xml.match(/<w:sectPr/g) ?? []).length
out.docxDrawings = (xml.match(/<w:drawing>/g) ?? []).length
out.docxHasTitle = xml.includes('Hợp đồng thi công — trang 1/12')
out.docxHasBangKe = xml.includes('BẢNG KÊ VẬT TƯ THÁNG 09/2026')
out.docxBold = (xml.match(/<w:b\/>|<w:b w:val="true"\/>/g) ?? []).length
out.docxTabs = (xml.match(/<w:tab\/>/g) ?? []).length
out.docxLandscape = (xml.match(/w:orient="landscape"/g) ?? []).length
// Đoạn văn 3 dòng ở bảng kê phải thành MỘT đoạn.
const para = xml.split('</w:p>').find((p) => p.includes('Căn cứ hợp đồng'))
out.bangKeParagraphJoined = para ? para.includes('thanh toán') : false

// xlsx: số đọc thành số, mã giữ chữ.
const workbook = new ExcelJS.Workbook()
await workbook.xlsx.readFile(excel.result)
out.sheets = workbook.worksheets.length
const sheet = workbook.worksheets[12]
const rows = []
sheet.eachRow((row) => rows.push(row.values.slice(1)))
out.sheet13 = rows.slice(0, 9)
out.imageSheet = workbook.worksheets[16].getCell('A1').value

if (office) {
  // Word / Excel → PDF bằng LibreOffice rồi chụp để xem bằng mắt.
  const soffice = process.env.SOFFICE ?? 'C:/Program Files/LibreOffice/program/soffice.exe'
  for (const [kind, file] of [['word', word.result], ['excel', excel.result]]) {
    execFileSync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', OUT + 'lo-' + kind, file], { stdio: 'ignore' })
    const pdf = OUT + 'lo-' + kind + '/' + fs.readdirSync(OUT + 'lo-' + kind).find((name) => name.endsWith('.pdf'))
    page.on('dialog', (d) => d.accept())
    await page.reload()
    await page.getByText('Thả tệp PDF hoặc ảnh vào đây').waitFor({ timeout: 30000 })
    await page.locator('input[type=file]').first().setInputFiles([pdf])
    await page.locator('.erp-doc-page').first().waitFor({ timeout: 60000 })
    out['lo_' + kind + '_pages'] = await page.locator('.erp-doc-page').count()
    for (const n of kind === 'word' ? [1, 13, 14, 17] : [13]) {
      if (n > out['lo_' + kind + '_pages']) continue
      await page.locator('.erp-doc-page').nth(n - 1).scrollIntoViewIfNeeded()
      await page.getByRole('button', { name: `Xem to trang ${n}`, exact: true }).click()
      await page.locator('.erp-doc-preview__canvas canvas').waitFor()
      await page.waitForTimeout(1200)
      await shot(`lo-${kind}-${n}`)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(300)
    }
  }
}

out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
