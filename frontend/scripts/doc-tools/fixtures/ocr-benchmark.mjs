import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { chromium, outDir } from '../lib/qa.mjs'

const specification = JSON.parse(fs.readFileSync(new URL('../benchmark/ocr-cases.json', import.meta.url), 'utf8'))
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

export async function generateBenchmarkFixtures(directory = outDir('ocr-fixtures')) {
  fs.mkdirSync(directory, { recursive: true })
  const browser = await chromium.launch({ channel: 'chrome', headless: true })
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 1 })
  const manifest = { version: specification.version, reviewStatus: specification.reviewStatus, source: 'synthetic, generated from fixed text; no personal documents',
    browser: browser.version(), font: 'Arial', specificationSha256: hash(fs.readFileSync(new URL('../benchmark/ocr-cases.json', import.meta.url))), missingCoverage: specification.missingCoverage, cases: [] }
  const save = (name, bytes) => { fs.writeFileSync(path.join(directory, name), bytes); return { file: name, sha256: hash(bytes), bytes: bytes.length } }
  try {
    for (const item of specification.cases) {
      const document = specification.documents[item.document]
      await page.setContent('<meta charset="utf-8"><body style="margin:0;background:white"><canvas width="1200" height="760"></canvas></body>')
      const data = await page.evaluate(({ lines, variant, table }) => {
        const canvas = document.querySelector('canvas')
        const context = canvas.getContext('2d')
        context.fillStyle = 'white'; context.fillRect(0, 0, 1200, 760)
        const source = document.createElement('canvas'); source.width = 1200; source.height = 760
        const ink = source.getContext('2d')
        ink.fillStyle = 'white'; ink.fillRect(0, 0, 1200, 760)
        ink.font = table ? '36px Arial' : '42px Arial'; ink.fillStyle = variant === 'low-contrast' ? '#bdbdbd' : '#111'
        lines.forEach((line, index) => ink.fillText(line, 100, 140 + index * 100))
        if (table) {
          ink.strokeStyle = '#a0a0a0'; ink.lineWidth = 1
          for (let y = 165; y <= 565; y += 100) { ink.beginPath(); ink.moveTo(80, y); ink.lineTo(1100, y); ink.stroke() }
        }
        context.save()
        if (variant === 'skew') { context.translate(600, 380); context.rotate(4 * Math.PI / 180); context.translate(-600, -380) }
        if (variant === 'blur') context.filter = 'blur(2.5px)'
        context.drawImage(source, 0, 0); context.restore()
        if (variant === 'glare') {
          const gradient = context.createRadialGradient(590, 340, 5, 590, 340, 225)
          gradient.addColorStop(0, 'rgba(255,255,255,0.98)'); gradient.addColorStop(0.55, 'rgba(255,255,255,0.85)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
          context.fillStyle = gradient; context.fillRect(300, 100, 580, 480)
        }
        if (variant === 'small') {
          const small = document.createElement('canvas'); small.width = 480; small.height = 304
          small.getContext('2d').drawImage(canvas, 0, 0, 480, 304)
          return small.toDataURL('image/png').split(',')[1]
        }
        return canvas.toDataURL('image/png').split(',')[1]
      }, { lines: document.lines, variant: item.variant, table: item.document === 'table' })
      const bytes = Buffer.from(data, 'base64')
      manifest.cases.push({ ...item, ...save(item.id + '.png', bytes), expectedText: document.lines.join('\n'), fields: document.fields })
    }
    const receipt = fs.readFileSync(path.join(directory, 'RECEIPT-CLEAN.png'))
    const scan = await PDFDocument.create(); const image = await scan.embedPng(receipt)
    scan.addPage([600, 380]).drawImage(image, { x: 0, y: 0, width: 600, height: 380 })
    manifest.scan = save('receipt-scan.pdf', await scan.save())
    manifest.pdfs = []
    for (const [name, count, start] of [['pages-a.pdf', 3, 1], ['pages-b.pdf', 2, 4]]) {
      const pdf = await PDFDocument.create(); const font = await pdf.embedFont(StandardFonts.Helvetica)
      for (let i = 0; i < count; i++) pdf.addPage([595, 842]).drawText(`P0 PAGE ${start + i}`, { x: 60, y: 730, size: 28, font })
      manifest.pdfs.push(save(name, await pdf.save()))
    }
    const photo = Buffer.from(await page.evaluate(() => {
      const canvas = document.createElement('canvas'); canvas.width = 1600; canvas.height = 1000
      const context = canvas.getContext('2d'); const pixels = context.createImageData(1600, 1000)
      let seed = 713
      for (let i = 0; i < pixels.data.length; i += 4) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
        pixels.data[i] = seed & 255; pixels.data[i + 1] = (seed >>> 8) & 255; pixels.data[i + 2] = (seed >>> 16) & 255; pixels.data[i + 3] = 255
      }
      context.putImageData(pixels, 0, 0)
      return canvas.toDataURL('image/jpeg', 0.98).split(',')[1]
    }), 'base64')
    manifest.photo = save('compressible-photo.jpg', photo)
    const photoPdf = await PDFDocument.create(); const jpeg = await photoPdf.embedJpg(photo)
    photoPdf.addPage([800, 500]).drawImage(jpeg, { x: 0, y: 0, width: 800, height: 500 })
    manifest.compressiblePdf = save('compressible.pdf', await photoPdf.save())
    fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')
    return { directory, manifest }
  } finally { await browser.close() }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const result = await generateBenchmarkFixtures(process.env.OCR_FIXTURES)
  console.log(JSON.stringify({ directory: result.directory, cases: result.manifest.cases.length, missingCoverage: result.manifest.missingCoverage }))
}
