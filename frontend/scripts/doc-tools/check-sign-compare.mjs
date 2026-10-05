// "Chèn chữ ký" và "So sánh tài liệu". Mỗi công cụ chạy THẬT rồi mở tệp tải về ra soi:
// chữ ký nằm đúng trang, nhúng MỘT ảnh cho mọi chỗ đặt; báo cáo so sánh chỉ ra đúng dòng đã đổi.
// Cần tệp mẫu: node scripts/doc-tools/make-fixtures.mjs
//
//   THEME=dark VIEW=360x800 ONLY=sign,compare node scripts/doc-tools/check-sign-compare.mjs
import { createRequire } from 'node:module'
import fs from 'node:fs'
import { chromium, outDir, HUB, FIX } from './lib/qa.mjs'

const appRequire = createRequire(import.meta.url)
const { PDFDocument, PDFName, PDFDict } = appRequire('pdf-lib')

const OUT = outDir('sign-compare')
const theme = process.env.THEME ?? 'light'
const [vw, vh] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const mobile = vw <= 576
const only = process.env.ONLY ? process.env.ONLY.split(',') : null
const want = (name) => !only || only.includes(name)

let stage = 'init'
const errors = []
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: vw, height: vh }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, acceptDownloads: true })
const page = await context.newPage()
page.on('console', (m) => m.type() === 'error' && errors.push(`${stage}: ${m.text().slice(0, 200)}`))
page.on('pageerror', (e) => errors.push(`${stage}: ${String(e)}`))
// Đang có nét ký / chỗ đặt thì `goto` bật hộp `beforeunload`.
page.on('dialog', (dialog) => void dialog.accept())

const out = { theme, vw }
const shot = (name) => page.screenshot({ path: `${OUT}${theme}-${vw}-${name}.png`, fullPage: true })
const overflow = () => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
const text = async (selector) => ((await page.locator(selector).count()) ? (await page.locator(selector).first().innerText()).replace(/\s+/g, ' ').trim() : null)
const touch = () => page.locator('.erp-flow__side select, .erp-flow__side input[type=text], .erp-flow__side .btn, .erp-page-stage .btn').evaluateAll((items) => Math.min(...items.filter((item) => item.offsetParent).map((item) => Math.round(item.getBoundingClientRect().height))))

async function open(slug) {
  stage = slug
  await page.goto(`${HUB}/${slug}`)
  await page.evaluate((t) => {
    const raw = localStorage.getItem('erpcons.app')
    const data = raw ? JSON.parse(raw) : { state: {}, version: 0 }
    data.state.theme = t
    localStorage.setItem('erpcons.app', JSON.stringify(data))
  }, theme)
  await page.reload()
  await page.locator('.erp-flow-picker').first().waitFor({ timeout: 30000 })
}

const add = (names) => page.locator('.erp-flow-picker input[type=file]').setInputFiles(names.map((name) => (name.includes('/') ? name : FIX + name)))

async function run() {
  await page.locator('.erp-flow__run').click()
  await page.locator('.erp-flow-result').waitFor({ timeout: 120000 })
  return { title: await text('.erp-flow-result__title'), notes: await page.locator('.erp-flow-result__notes li').allInnerTexts() }
}

async function download() {
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.getByRole('button', { name: 'Tải về' }).click()])
  const saved = OUT + dl.suggestedFilename()
  await dl.saveAs(saved)
  return { name: dl.suggestedFilename(), path: saved, bytes: fs.readFileSync(saved) }
}

/** Kéo một nét qua các điểm (tỉ lệ 0–1 của khung `locator`). */
async function stroke(locator, points) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  const at = ([fx, fy]) => [box.x + box.width * fx, box.y + box.height * fy]
  await page.mouse.move(...at(points[0]))
  await page.mouse.down()
  for (const point of points.slice(1)) await page.mouse.move(...at(point), { steps: 6 })
  await page.mouse.up()
}

async function tap(locator, fx, fy) {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy)
}

/** Tâm từng chữ ký đang hiện, theo tỉ lệ của trang. */
const marks = () =>
  page.locator('.erp-sign').evaluate((layer) => {
    const frame = layer.getBoundingClientRect()
    return [...layer.querySelectorAll('.erp-sign__mark')].map((mark) => {
      const rect = mark.getBoundingClientRect()
      return [Math.round(((rect.left + rect.width / 2 - frame.left) / frame.width) * 100), Math.round(((rect.top + rect.height / 2 - frame.top) / frame.height) * 100), Math.round((rect.width / frame.width) * 100)]
    })
  })

/** Ảnh XObject của từng trang: số lần vẽ ảnh (`Do`) và số object ảnh KHÁC nhau trong cả tệp. */
async function stampsOf(bytes) {
  const doc = await PDFDocument.load(bytes)
  const refs = new Set()
  const perPage = doc.getPages().map((item) => {
    const resources = item.node.Resources()
    const xobjects = resources?.lookupMaybe(PDFName.of('XObject'), PDFDict)
    let images = 0
    for (const [, ref] of xobjects?.entries() ?? []) {
      const object = doc.context.lookup(ref)
      if (object?.dict?.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
        images++
        refs.add(String(ref))
      }
    }
    return images
  })
  return { pages: perPage.length, signedPages: perPage.flatMap((count, index) => (count > 0 ? [index + 1] : [])), distinctImages: refs.size }
}

// ---------- 1. Chèn chữ ký ----------
if (want('sign')) {
  const o = (out.sign = {})
  await open('ky-tai-lieu')
  await add(['hop-dong.pdf'])
  await page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })
  o.blockedEmpty = await text('.erp-flow__hint')
  o.overlayBeforeInk = await page.locator('.erp-sign').count()

  const pad = page.locator('.erp-sign-pad')
  await stroke(pad, [[0.15, 0.6], [0.3, 0.25], [0.4, 0.7], [0.55, 0.3], [0.7, 0.65]])
  await stroke(pad, [[0.6, 0.45], [0.85, 0.4]])
  const layer = page.locator('.erp-sign')
  await layer.waitFor({ timeout: 30000 })
  o.padLabel = await pad.getAttribute('aria-label')
  o.blockedUnplaced = await text('.erp-flow__hint')

  await tap(layer, 0.7, 0.8)
  o.placed = await marks()
  // Kéo chữ ký sang trái-giữa trang.
  await stroke(layer, [[0.7, 0.8], [0.5, 0.65], [0.3, 0.5]])
  o.moved = await marks()
  await tap(layer, 0.75, 0.15)
  o.two = (await marks()).length
  // Bấm vào chữ ký thứ hai mà không kéo: bỏ.
  await tap(layer, 0.75, 0.15)
  o.afterRemove = (await marks()).length
  // Đặt sát góc: cả chữ ký phải nằm trong trang.
  await tap(layer, 0.995, 0.995)
  o.corner = (await marks())[1]
  await page.getByRole('button', { name: 'Bỏ chữ ký vừa đặt' }).click()
  o.afterUndo = (await marks()).length

  await page.getByRole('button', { name: 'Tới trang cuối' }).click()
  await page.locator('.erp-page-stage__page').filter({ hasText: 'Trang 12/12' }).waitFor()
  await page.waitForTimeout(600)
  await tap(page.locator('.erp-sign'), 0.5, 0.5)
  o.meta = await text('.erp-page-stage__meta')
  o.runLabel = await text('.erp-flow__run')
  o.overflow = await overflow()
  o.touchMin = await touch()
  await page.locator('.erp-page-stage').scrollIntoViewIfNeeded()
  await shot('sign-stage')
  await pad.scrollIntoViewIfNeeded()
  await shot('sign-options')

  // Đổi nguồn: ảnh vẽ tay không được ở lại trên trang.
  await page.getByRole('radio', { name: /^Ảnh có sẵn/ }).check()
  o.marksAfterSwitch = await page.locator('.erp-sign__mark').count()
  o.blockedNoImage = await text('.erp-flow__hint')
  await page.getByLabel('Ảnh chữ ký').setInputFiles(FIX + 'so-do-trong-suot.png')
  await page.locator('.erp-sign__mark').first().waitFor({ timeout: 30000 })
  o.imageHint = await text('.erp-flow-field__hint')
  await page.getByRole('radio', { name: /^Vẽ tay/ }).check()
  await page.locator('.erp-sign__mark').first().waitFor({ timeout: 30000 })

  o.result = await run()
  await shot('sign-result')
  const file = await download()
  o.file = { name: file.name, ...(await stampsOf(file.bytes)) }

  // Mở lại tệp ra bằng chính công cụ để NHÌN chữ ký đã nằm trên trang.
  await open('ky-tai-lieu')
  await add([file.path])
  await page.locator('.erp-page-stage__canvas canvas').waitFor({ timeout: 60000 })
  await page.waitForTimeout(800)
  await page.locator('.erp-page-stage').scrollIntoViewIfNeeded()
  await shot('sign-output-page1')
}

// ---------- 2. So sánh tài liệu ----------
if (want('compare')) {
  const o = (out.compare = {})
  await open('so-sanh-tai-lieu')
  await add(['hop-dong.pdf'])
  await page.locator('.erp-flow-file').first().waitFor({ timeout: 60000 })
  o.blockedOne = await text('.erp-flow__hint')
  await add(['hop-dong-v2.pdf'])
  await page.locator('.erp-flow-file').nth(1).waitFor({ timeout: 60000 })
  o.order = await text('.erp-flow__side .erp-flow-field__hint')
  o.overflow = await overflow()
  o.touchMin = await touch()
  await shot('compare-setup')

  o.result = await run()
  o.label = await text('.erp-flow-result__text-label')
  const shown = await page.locator('.erp-flow-result__text-body').inputValue()
  o.report = shown.split('\n')
  o.resultOverflow = await overflow()
  await shot('compare-result')
  const file = await download()
  o.file = { name: file.name, sameAsShown: file.bytes.toString('utf8') === shown }

  // Hai bản y hệt nhau.
  await open('so-sanh-tai-lieu')
  await add(['hop-dong.pdf'])
  await page.locator('.erp-flow-file').first().waitFor({ timeout: 60000 })
  await add(['hop-dong.pdf'])
  await page.locator('.erp-flow-file').nth(1).waitFor({ timeout: 60000 })
  o.same = await run()

  // Tệp scan không có lớp chữ: phải báo lỗi, không được báo "giống nhau".
  await open('so-sanh-tai-lieu')
  const blank = await PDFDocument.create()
  blank.addPage([595, 842]).drawRectangle({ x: 100, y: 100, width: 200, height: 200 })
  fs.writeFileSync(OUT + 'khong-chu.pdf', await blank.save())
  await add([OUT + 'khong-chu.pdf'])
  await page.locator('.erp-flow-file').first().waitFor({ timeout: 60000 })
  await add(['hop-dong.pdf'])
  await page.locator('.erp-flow-file').nth(1).waitFor({ timeout: 60000 })
  await page.locator('.erp-flow__run').click()
  await page.locator('.erp-flow-error, .erp-flow-result').first().waitFor({ timeout: 120000 })
  o.scanError = await text('.erp-flow-error')
  o.scanResult = await text('.erp-flow-result__title')
  await shot('compare-scan-error')
}

out.errors = errors
console.log(JSON.stringify(out, null, 1))
await browser.close()
