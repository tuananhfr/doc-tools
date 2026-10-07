import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { chromium, outDir } from '../lib/qa.mjs'
import { generateBenchmarkFixtures } from './ocr-benchmark.mjs'
import { validateDataset } from '../check-ocr-dataset.mjs'

const specification = JSON.parse(fs.readFileSync(new URL('../benchmark/ocr-cases-v2.json', import.meta.url), 'utf8'))
const issues = validateDataset(specification)
if (issues.length) throw new Error(issues.join('\n'))
const directory = path.resolve(process.env.OCR_FIXTURES ?? outDir('ocr-fixtures-v2'))
const baseline = await generateBenchmarkFixtures(path.join(directory, 'baseline-v1'))
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const manifest = { version: 2, reviewStatus: 'draft', source: 'synthetic and user-authorized local input; no handwriting accuracy claim', baseline: baseline.manifest,
  missingCoverage: specification.missingCoverage, cases: [], pending: [] }
try {
  for (const item of specification.cases) {
    if (item.source === 'real') {
      const input = process.env.HANDWRITING_INPUT
      manifest.pending.push({ id: item.id, inputSha256: input ? hash(fs.readFileSync(input)) : null, groundTruth: 'pending', permission: item.permission, source: 'real' })
      continue
    }
    const truth = structuredClone(item.copyTruth ? specification.cases.find(reference => reference.id === item.copyTruth).groundTruth : item.groundTruth)
    if (item.variant === 'rowspan') {
      truth.cells.find(cell => cell.row === 2 && cell.column === 0).rowSpan = 2
      truth.cells = truth.cells.filter(cell => !(cell.row === 3 && cell.column === 0))
      truth.text = truth.text.replace('0007 Gạch', 'Gạch')
    }
    await page.setContent('<meta charset="utf-8"><canvas width="1200" height="900"></canvas>')
    const data = await page.evaluate(({ truth, variant }) => {
      const canvas = document.querySelector('canvas'), context = canvas.getContext('2d')
      const source = document.createElement('canvas'); source.width = 1200; source.height = 900
      const ink = source.getContext('2d'); ink.fillStyle = 'white'; ink.fillRect(0, 0, 1200, 900)
      const xs = [60, 250, 650, 850, 1140], ys = Array.from({ length: 7 }, (_, index) => 80 + index * 100)
      ink.strokeStyle = '#222'; ink.lineWidth = 3
      for (let row = 0; row <= 6; row++) for (let column = 0; column < 4; column++) {
        if (truth.cells.some(cell => cell.row < row && cell.row + (cell.rowSpan ?? 1) > row && cell.column <= column && cell.column + (cell.columnSpan ?? 1) > column)) continue
        ink.beginPath(); ink.moveTo(xs[column], ys[row]); ink.lineTo(xs[column + 1], ys[row]); ink.stroke()
      }
      for (let row = 0; row < 6; row++) for (let column = 0; column <= 4; column++) {
        if (truth.cells.some(cell => cell.column < column && cell.column + (cell.columnSpan ?? 1) > column && cell.row <= row && cell.row + (cell.rowSpan ?? 1) > row)) continue
        ink.beginPath(); ink.moveTo(xs[column], ys[row]); ink.lineTo(xs[column], ys[row + 1]); ink.stroke()
      }
      ink.font = '30px Arial'
      const cells = truth.cells.map(cell => {
        const bbox = { x: xs[cell.column], y: ys[cell.row], width: xs[cell.column + (cell.columnSpan ?? 1)] - xs[cell.column], height: 100 * (cell.rowSpan ?? 1) }
        ink.fillStyle = variant === 'color' ? cell.column === 3 ? '#ab1533' : '#163c9b' : '#111'
        ink.fillText(cell.text, bbox.x + 18, bbox.y + 59)
        return { ...cell, bbox }
      })
      context.fillStyle = 'white'; context.fillRect(0, 0, 1200, 900)
      const theta = 3 * Math.PI / 180, cos = Math.cos(theta), sin = Math.sin(theta)
      const matrix = variant === 'perspective' ? [0.94, 0.04, 20, 0.015, 0.9, 40, 0.00008, -0.00006, 1] : variant === 'skew' ? [cos, -sin, 600 - 600 * cos + 450 * sin, sin, cos, 450 - 600 * sin - 450 * cos, 0, 0, 1] : [1, 0, 0, 0, 1, 0, 0, 0, 1]
      const project = (m, x, y) => { const w = m[6] * x + m[7] * y + m[8]; return { x: (m[0] * x + m[1] * y + m[2]) / w, y: (m[3] * x + m[4] * y + m[5]) / w } }
      if (variant === 'perspective') {
        const [a,b,c,d,e,f,g,h,i] = matrix
        const inverse = [e*i-f*h,c*h-b*i,b*f-c*e,f*g-d*i,a*i-c*g,c*d-a*f,d*h-e*g,b*g-a*h,a*e-b*d]
        const pixels = ink.getImageData(0, 0, 1200, 900).data, output = context.getImageData(0, 0, 1200, 900)
        for (let y = 0; y < 900; y++) for (let x = 0; x < 1200; x++) {
          const point = project(inverse, x, y), sx = Math.round(point.x), sy = Math.round(point.y)
          if (sx < 0 || sy < 0 || sx >= 1200 || sy >= 900) continue
          const from = (sy * 1200 + sx) * 4, to = (y * 1200 + x) * 4
          output.data.set(pixels.subarray(from, from + 4), to)
        }
        context.putImageData(output, 0, 0)
      } else { context.setTransform(matrix[0], matrix[3], matrix[1], matrix[4], matrix[2], matrix[5]); context.drawImage(source, 0, 0); context.setTransform(1, 0, 0, 1, 0, 0) }
      if (variant === 'glare') {
        const gradient = context.createRadialGradient(965, 380, 10, 965, 380, 170)
        gradient.addColorStop(0, 'rgba(255,255,255,1)'); gradient.addColorStop(1, 'rgba(255,255,255,0)')
        context.fillStyle = gradient; context.fillRect(760, 180, 400, 400)
      }
      const transformed = cells.map(cell => {
        const box = cell.bbox, quad = [[box.x,box.y],[box.x+box.width,box.y],[box.x+box.width,box.y+box.height],[box.x,box.y+box.height]].map(([x,y]) => project(matrix,x,y))
        const xs = quad.map(p => p.x), ys = quad.map(p => p.y)
        return { ...cell, quad, bbox: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs)-Math.min(...xs), height: Math.max(...ys)-Math.min(...ys) } }
      })
      return { png: canvas.toDataURL('image/png').split(',')[1], cells: transformed, transform: matrix, paperCorners: [[0,0],[1200,0],[1200,900],[0,900]].map(([x,y]) => project(matrix,x,y)) }
    }, { truth, variant: item.variant })
    const bytes = Buffer.from(data.png, 'base64'), file = `${item.id}.png`
    fs.writeFileSync(path.join(directory, file), bytes)
    const fields = data.cells.filter(cell => cell.row >= 2 && (cell.column === 3 || cell.column === 0 && /^\d/u.test(cell.text) || /^\d{2}\/\d{2}\/\d{4}$/u.test(cell.text))).map(cell => ({ id: `field:${cell.row}:${cell.column}`, kind: cell.column === 3 ? 'money' : cell.column === 0 ? 'identifier' : 'date', text: cell.text, quad: cell.quad }))
    const regions = [{ id: 'table', kind: 'table', quad: [data.cells[0].quad[0], data.cells[0].quad[1], data.cells.at(-1).quad[2], data.cells.find(cell => cell.row === 5 && cell.column === 0).quad[3]], cellIds: data.cells.map(cell => `${cell.row}:${cell.column}`) }]
    manifest.cases.push({ ...item, file, sha256: hash(bytes), bytes: bytes.length, expectedText: truth.text, groundTruth: { ...truth, rows: 6, columns: 4, cells: data.cells, fields, regions }, transform: data.transform, paperCorners: data.paperCorners })
  }
  fs.writeFileSync(path.join(directory, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8')
  console.log(JSON.stringify({ directory, cases: manifest.cases.length, pending: manifest.pending }))
} finally { await browser.close() }
