import fs from 'node:fs'
import path from 'node:path'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { chromium, outDir, mockFreeSession } from './lib/qa.mjs'

const site = process.env.SITE ?? 'http://localhost:37062', out = outDir('ocr-pdf-visual')
const inputs = process.env.OCR_EXPORTS
assert(inputs, 'OCR_EXPORTS must contain reviewed PDF outputs')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const context = await browser.newContext({ viewport: { width: 1280, height: 950 } })
await mockFreeSession(context)
await context.route('**/__qa/pdf.mjs', route => route.fulfill({ path: path.resolve('node_modules/pdfjs-dist/build/pdf.mjs'), contentType: 'text/javascript' }))
await context.route('**/__qa/pdf.worker.mjs', route => route.fulfill({ path: path.resolve('node_modules/pdfjs-dist/build/pdf.worker.mjs'), contentType: 'text/javascript' }))
const page = await context.newPage(), errors = []
page.on('pageerror', error => errors.push(String(error)))
const report = { createdAt: new Date().toISOString(), target: site, engine: 'PDF.js 6.2.108 in Chrome', cases: [], errors }
try {
  await page.goto(site + '/cong-cu', { waitUntil: 'networkidle' })
  report.build = await page.evaluate(async () => (await (await fetch('/offline-manifest.json')).json()).version)
  if (process.env.EXPECTED_BUILD) assert.equal(report.build, process.env.EXPECTED_BUILD)
  for (const name of ['GRID-CLEAN', 'GRID-PERSPECTIVE', 'GRID-COLOR', 'GRID-ROWSPAN']) {
    const bytes = fs.readFileSync(path.join(inputs, name + '.pdf'))
    await page.setContent('<meta charset="utf-8"><style>body{margin:24px;background:#eef3fa}canvas{display:block;background:white}</style><canvas></canvas>')
    const result = await page.evaluate(async ({ base64, site }) => {
      const pdfjs = await import('/__qa/pdf.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = '/__qa/pdf.worker.mjs'
      const data = Uint8Array.from(atob(base64), character => character.charCodeAt(0))
      const document = await pdfjs.getDocument({ data, wasmUrl: site + '/vendor/pdfjs/6.2.108/' }).promise
      try {
        const first = await document.getPage(1), viewport = first.getViewport({ scale: 1.2 }), canvas = window.document.querySelector('canvas')
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height)
        await first.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
        const pixels = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data
        let nonWhite = 0; for (let index = 0; index < pixels.length; index += 4) if (pixels[index] < 220 || pixels[index + 1] < 220 || pixels[index + 2] < 220) nonWhite++
        return { pages: document.numPages, width: canvas.width, height: canvas.height, nonWhite, text: (await first.getTextContent()).items.map(item => item.str).join(' ') }
      } finally { await document.loadingTask.destroy() }
    }, { base64: bytes.toString('base64'), site })
    assert.equal(result.pages, 1); assert(result.nonWhite > 1000); assert(result.text.includes('0012'))
    const screenshot = name + '-pdf.png'; await page.screenshot({ path: path.join(out, screenshot) })
    report.cases.push({ name, pdfSha256: createHash('sha256').update(bytes).digest('hex'), screenshot, ...result })
  }
  assert.equal(errors.length, 0); report.status = 'passed'
} catch (error) { report.status = 'failed'; report.error = String(error); process.exitCode = 1 }
finally { fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n', 'utf8'); await browser.close() }
