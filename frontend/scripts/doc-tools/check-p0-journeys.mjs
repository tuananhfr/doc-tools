import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { PDFDocument, PDFName, PDFRawStream, PDFDict } from 'pdf-lib'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'
import { chromium, outDir } from './lib/qa.mjs'
import { generateBenchmarkFixtures } from './fixtures/ocr-benchmark.mjs'
import { normalizeOcrText } from './lib/ocr-metrics.mjs'

const require = createRequire(import.meta.url)
const { RGBLuminanceSource, BinaryBitmap, HybridBinarizer, QRCodeReader } = require('@zxing/library')
const specification = JSON.parse(fs.readFileSync(new URL('./benchmark/p0-journeys.json', import.meta.url), 'utf8'))
const site = (process.env.SITE ?? 'http://localhost:3012').replace(/\/$/, '')
const [width, height] = (process.env.VIEW ?? '1440x900').split('x').map(Number)
const out = outDir(`p0-journeys-${width}`)
const directory = process.env.OCR_FIXTURES ?? outDir('ocr-fixtures')
if (!fs.existsSync(path.join(directory, 'manifest.json'))) await generateBenchmarkFixtures(directory)
const fixtureBytes = fs.readFileSync(path.join(directory, 'manifest.json'))
const fixtures = JSON.parse(fixtureBytes)
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const fileHashes = new Map([...fixtures.cases, ...fixtures.pdfs, fixtures.photo, fixtures.scan, fixtures.compressiblePdf].map(item => [item.file, item.sha256]))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width, height }, hasTouch: width < 600, acceptDownloads: true })
await context.route('**/api/v1/tools/**', route => route.fulfill({ json: { ok: true, total: 0 } }))
const page = await context.newPage()
page.on('dialog', dialog => void dialog.accept())
const errors = []; const unexpectedWrites = []
page.on('pageerror', error => errors.push(String(error)))
context.on('request', request => {
  if (['GET', 'HEAD'].includes(request.method())) return
  const url = new URL(request.url())
  try {
    const body = JSON.parse(request.postData() ?? '{}')
    if (url.origin === new URL(site).origin && url.pathname.endsWith('/api/v1/tools/visits') && Object.keys(body).length === 1 && typeof body.tool === 'string') return
  } catch { /* Invalid counter bodies must fail the privacy check. */ }
  unexpectedWrites.push(url.pathname)
})
const report = { version: specification.version, reviewStatus: specification.reviewStatus, target: site, actor: 'anonymous Free user',
  browser: browser.version(), viewport: { width, height }, fixtureManifestSha256: hash(fixtureBytes), createdAt: new Date().toISOString(), cases: [],
  limitations: ['Synthetic fixtures, emulated viewport, no physical phone coverage', 'Steps count scripted UI actions; no human usability or help-required measurement', 'Only eight candidates; full P0 policy and BA/QA approval remain pending', 'No OCR handwriting quality claim'] }

async function pdfText(bytes) {
  const document = await pdfjs.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise
  try {
    const pages = []
    for (let number = 1; number <= document.numPages; number++) {
      pages.push(normalizeOcrText((await (await document.getPage(number)).getTextContent()).items.map(item => item.str).join(' ')))
    }
    return pages
  } finally { await document.loadingTask.destroy() }
}

async function pixels(bytes, includePixels = false) {
  return page.evaluate(async ({ base64, includePixels }) => {
    const raw = Uint8Array.from(atob(base64), char => char.charCodeAt(0))
    const bitmap = await createImageBitmap(new Blob([raw]))
    try {
      if (!includePixels) return { width: bitmap.width, height: bitmap.height }
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height
      const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0)
      const data = context.getImageData(0, 0, canvas.width, canvas.height).data
      const grayscale = []
      for (let i = 0; i < data.length; i += 4) grayscale.push(Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114))
      return { width: bitmap.width, height: bitmap.height, grayscale }
    } finally { bitmap.close() }
  }, { base64: bytes.toString('base64'), includePixels })
}

async function validate(story, bytes) {
  if (story.validator === 'reviewed-text') {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    assert(text.includes(story.expected)); assert(!text.includes(story.correction.from))
    return { correctedTextPresent: true, originalAmountAbsent: true }
  }
  if (story.validator === 'smaller-image-same-dimensions' || story.validator === 'decode-qr') {
    const image = await pixels(bytes, story.validator === 'decode-qr')
    if (story.validator === 'decode-qr') {
      const bitmap = new BinaryBitmap(new HybridBinarizer(new RGBLuminanceSource(Uint8ClampedArray.from(image.grayscale), image.width, image.height)))
      const payload = new QRCodeReader().decode(bitmap).getText()
      assert.equal(payload, story.expected)
      return { decodedPayload: payload, width: image.width, height: image.height }
    }
    assert.equal(image.width, story.expected.width); assert.equal(image.height, story.expected.height)
    assert(bytes.length < fs.statSync(path.join(directory, story.fixtures[0])).size)
    return { smaller: true, width: image.width, height: image.height }
  }
  const document = await PDFDocument.load(bytes)
  if (story.validator === 'pdf-ordered-pages') {
    const text = await pdfText(bytes); assert.deepEqual(text, story.expected)
    return { pages: document.getPageCount(), text }
  }
  if (story.validator === 'reviewed-pdf-text') {
    const text = (await pdfText(bytes)).join(' ')
    assert(text.includes(story.expected)); assert(!text.includes(story.correction.from)); assert.equal(document.getPageCount(), 1)
    return { correctedTextPresent: true, originalAmountAbsent: true, pages: 1 }
  }
  assert.equal(document.getPageCount(), story.expected.pages)
  if (story.validator === 'smaller-pdf-preserves-page') {
    const first = document.getPage(0)
    assert.equal(first.getWidth(), story.expected.width); assert.equal(first.getHeight(), story.expected.height)
    assert(bytes.length < fs.statSync(path.join(directory, story.fixtures[0])).size)
    assert(document.context.enumerateIndirectObjects().some(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')))
    return { smaller: true, pages: 1, size: [first.getWidth(), first.getHeight()] }
  }
  assert.equal(story.validator, 'pdf-image-pages', 'Unknown output validator')
  const imageHashes = []
  for (let i = 0; i < story.fixtures.length; i++) {
    const reference = await PDFDocument.create()
    const expectedImage = await reference.embedPng(fs.readFileSync(path.join(directory, story.fixtures[i])))
    await reference.save()
    const expected = reference.context.lookup(expectedImage.ref, PDFRawStream)
    const resources = document.getPage(i).node.Resources().lookup(PDFName.of('XObject'), PDFDict)
    const images = resources.values().map(ref => document.context.lookup(ref)).filter(object => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype')) === PDFName.of('Image'))
    assert(images.some(image => hash(image.getContents()) === hash(expected.getContents())
      && image.dict.get(PDFName.of('Width')).toString() === expected.dict.get(PDFName.of('Width')).toString()
      && image.dict.get(PDFName.of('Height')).toString() === expected.dict.get(PDFName.of('Height')).toString()), 'Page image does not match the corresponding source')
    imageHashes.push(hash(expected.getContents()))
  }
  return { pages: document.getPageCount(), sourceImageStreamsMatchInOrder: true, imageHashes }
}

try {
  await page.goto(site + '/', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async url => (await (await fetch(url)).json()).version, site + '/offline-manifest.json')
  for (const story of specification.cases.filter(item => !process.env.ONLY || process.env.ONLY.split(',').includes(item.id))) {
    for (const entry of process.env.ENTRY ? [process.env.ENTRY] : ['search', 'browse']) {
      assert(['search', 'browse'].includes(entry), 'ENTRY must be search or browse')
      const id = story.id + '-' + entry
      const result = { id, storyId: story.id, entry, query: entry === 'search' ? story.query : null, persona: 'GENERAL_LOW_TECH', expected: story.expected, steps: 0, backtracks: 0 }
      const started = Date.now(); const errorsBefore = errors.length
      await context.tracing.start({ screenshots: true, snapshots: true })
      try {
        // `/` is the landing page; search and the category directory both live on `/cong-cu`.
        await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' }); result.steps++
        if (entry === 'search') {
          await page.locator('#tim-cong-cu').fill(story.query); result.steps++
          const card = page.locator('.erp-tools-grid .erp-tool-card').filter({ has: page.locator('.erp-tool-card__name', { hasText: story.name }) })
          // The route is asserted after discovery, never used as the task entry.
          const candidate = await card.count() ? card.first() : page.locator('.erp-tools-grid .erp-tool-card').filter({ hasText: story.name }).first()
          await candidate.click(); result.steps++
        } else {
          await page.getByRole('button', { name: story.category, exact: true }).click(); result.steps++
          await page.locator('.erp-tool-card').filter({ hasText: story.name }).first().click(); result.steps++
        }
        await page.waitForURL('**/' + story.slug)
        result.discoveredUrl = page.url()
        for (const file of story.fixtures) assert.equal(hash(fs.readFileSync(path.join(directory, file))), fileHashes.get(file), 'Fixture input changed')
        if (story.fixtures.length) { await page.locator('input[type=file]').first().setInputFiles(story.fixtures.map(file => path.join(directory, file))); result.steps++ }
        if (story.ranges) { await page.getByLabel('Khoảng trang', { exact: true }).fill(story.ranges); result.steps++ }
        if (story.validator === 'decode-qr') {
          await page.locator('input[type=url]').fill(story.expected); result.steps++
        } else {
          await page.locator('.erp-flow__run').click(); result.steps++
          if (story.correction) {
            await page.locator('.cn-ocr-review').waitFor({ timeout: 120000 })
            assert(await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).isDisabled())
            const word = page.locator('.cn-ocr-review__word').filter({ hasText: new RegExp('^' + story.correction.from + '\\s') })
            assert.equal(await word.count(), 1, 'Expected amount not recognized; correction journey cannot proceed')
            await word.click(); result.steps++
            await page.locator('#ocr-word-value').fill(story.correction.to); result.steps++
            await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click(); result.steps++
            let confirmations = 0
            while (await page.locator('.cn-ocr-review__word.needs-review').count()) {
              assert(confirmations++ < 250, 'Review did not advance')
              await page.locator('.cn-ocr-review__word.needs-review').first().click(); result.steps++
              await page.getByRole('button', { name: 'Xác nhận và tiếp tục', exact: true }).click(); result.steps++
            }
            result.automatedConfirmations = confirmations
            await page.getByRole('button', { name: 'Xuất kết quả đã kiểm tra', exact: true }).click(); result.steps++
          }
          await page.locator('.erp-flow-result').waitFor({ timeout: 120000 })
        }
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
        assert(overflow <= 1, 'Horizontal page overflow')
        await page.screenshot({ path: path.join(out, id + '.png') })
        const pending = page.waitForEvent('download')
        await page.getByRole('button', { name: story.validator === 'decode-qr' ? 'Tải mã QR' : 'Tải về', exact: true }).click(); result.steps++
        const download = await pending
        const filename = id + '-output' + path.extname(download.suggestedFilename()); await download.saveAs(path.join(out, filename))
        const bytes = fs.readFileSync(path.join(out, filename))
        result.output = { file: filename, bytes: bytes.length, sha256: hash(bytes), validation: await validate(story, bytes) }
        assert.equal(errors.length, errorsBefore, 'Browser runtime error during task')
        result.status = 'passed'
      } catch (error) {
        result.status = 'failed'; result.error = String(error); result.url = page.url(); result.visibleMessage = (await page.locator('body').innerText()).slice(-1700)
        await page.screenshot({ path: path.join(out, id + '-failure.png') }).catch(() => {})
      } finally {
        result.elapsedMs = Date.now() - started
        await context.tracing.stop({ path: path.join(out, id + '-trace.zip') })
        report.cases.push(result)
        fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
        console.log(JSON.stringify({ id, status: result.status, steps: result.steps, error: result.error }))
      }
    }
  }
  assert(report.cases.length > 0, 'No journeys selected')
  assert.equal(await page.evaluate(async url => (await (await fetch(url)).json()).version, site + '/offline-manifest.json'), report.build, 'Build changed during run')
  assert.equal(unexpectedWrites.length, 0, 'Unexpected input writes')
  report.status = report.cases.every(item => item.status === 'passed') ? 'passed' : 'failed'
  if (report.status === 'failed') process.exitCode = 1
} catch (error) { report.status = 'failed'; report.error = String(error); process.exitCode = 1 }
finally {
  report.errors = errors; report.unexpectedWrites = unexpectedWrites
  report.summary = { passed: report.cases.filter(item => item.status === 'passed').length, total: report.cases.length }
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ status: report.status, ...report.summary, report: path.join(out, 'results.json') }))
  await browser.close()
}
