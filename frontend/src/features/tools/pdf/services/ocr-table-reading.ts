import type { OcrTable } from '../types/ocr-layout.types'
import type { Point } from '../utils/page-geometry'
import { recognizeCanvas, type OcrProgress } from './ocr'
import { localOcrPixels } from '../utils/ocr-local'
import { clearCellRules, rectifyCellPixels } from '../utils/ocr-cell-image'
import { enhancePixels } from '../utils/ocr-image-variants'
import type { Quad } from '../types/text-layer.types'
import type { OcrLine } from '../utils/ocr-runs'
import type { OcrWordResult } from '../types/ocr-result.types'
import { normalizeOcrLighting } from '../utils/ocr-lighting'
import { refineOcrLineMarks } from '../utils/ocr-refinement'
import { readOcrCellLines } from './ocr-cell-lines'

const contentLength = (value: string) => (value.match(/[\p{L}\p{N}]/gu) ?? []).length
function reading(lines: OcrLine[]) {
  const usable = lines.filter(line => line.words.some(word => /[\p{L}\p{N}]/u.test(word.text)))
  const words = usable.flatMap(line => line.words.filter(word => /[\p{L}\p{N}]/u.test(word.text)))
  const confidence = words.reduce((sum, word) => sum + word.confidence * contentLength(word.text), 0) / Math.max(1, words.reduce((sum, word) => sum + contentLength(word.text), 0))
  // A low-confidence letter in an otherwise legible label is not a blank cell.
  const text = usable.map(line => line.words.filter(word => /[\p{L}\p{N}]/u.test(word.text))
    .map(word => word.text.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})%]+$/gu, '')).join(' ')).join('\n').normalize('NFC')
  return { text, confidence, lines: usable.length, reading: usable }
}

/** Read ink-bearing cells separately; grid lines must not hide short numbers or labels. */
export async function readOcrTableCells(original: HTMLCanvasElement, tables: OcrTable[], toPixel: (point: Point) => Point, signal: AbortSignal, progress: (value: OcrProgress) => void, sourceWords: Pick<OcrWordResult, 'id' | 'rawText' | 'confidence'>[] = []) {
  const result = structuredClone(tables), cells = result.flatMap(table => table.cells)
  for (const [index, cell] of cells.entries()) {
    signal.throwIfAborted()
    const points = cell.bbox.map(toPixel)
    const x = Math.max(0, Math.floor(Math.min(...points.map(p => p.x)) - 1)), y = Math.max(0, Math.floor(Math.min(...points.map(p => p.y)) - 1))
    const cropWidth = Math.min(original.width, Math.ceil(Math.max(...points.map(p => p.x)) + 1)) - x
    const cropHeight = Math.min(original.height, Math.ceil(Math.max(...points.map(p => p.y)) + 1)) - y
    if (cropWidth < 8 || cropHeight < 8) continue
    const canvas = document.createElement('canvas'), enlarged = document.createElement('canvas'), legacy = document.createElement('canvas')
    try {
      canvas.width = cropWidth; canvas.height = cropHeight
      const context = canvas.getContext('2d', { willReadFrequently: true })!
      context.drawImage(original, x, y, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight)
      const crop = context.getImageData(0, 0, cropWidth, cropHeight)
      const rectified = rectifyCellPixels(crop.data, cropWidth, cropHeight, points.map(point => ({ x: point.x - x, y: point.y - y })) as Quad)
      const { width, height, data: raw } = rectified
      canvas.width = width + 32; canvas.height = height + 32
      context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height)
      const pixels = context.createImageData(width, height)
      pixels.data.set(clearCellRules(localOcrPixels(raw, width, height, .12), width, height))
      let dark = 0
      for (let i = 0; i < pixels.data.length; i += 4) if (pixels.data[i] < 140) dark++
      // A genuinely blank cell stays blank, including merged headings with empty subregions.
      if (dark < 8) { cell.rawText = ''; continue }
      let expectedLines = 0, inkTop = -1, lastInk = -1
      for (let y = 6; y < height - 6; y++) {
        let ink = 0
        for (let x = 6; x < width - 6; x++) if (pixels.data[(y * width + x) * 4] < 140) ink++
        if (ink >= 2) { if (inkTop < 0) inkTop = y; lastInk = y }
        if (inkTop >= 0 && (y - lastInk > 3 || y === height - 7)) {
          if (lastInk - inkTop >= 4) expectedLines++
          inkTop = -1
        }
      }
      if (!expectedLines && !cell.rawText.trim()) { cell.rawText = ''; continue }
      context.putImageData(pixels, 16, 16)
      const scale = width < 900 && height < 160 ? 2 : 1
      let input = canvas
      if (scale > 1) { enlarged.width = canvas.width * scale; enlarged.height = canvas.height * scale; enlarged.getContext('2d')!.drawImage(canvas, 0, 0, enlarged.width, enlarged.height); input = enlarged }
      const owner = result.find(table => table.cells.includes(cell))!
      const headerDepth = Math.max(1, ...owner.cells.filter(header => header.row === 0).map(header => header.rowSpan))
      const formulaRow = cell.row === headerDepth && owner.cells.some(other => other.row === cell.row && /[=×]/.test(other.rawText))
      const numeric = cell.row >= headerDepth && !/[=×]/.test(cell.rawText) && (formulaRow || owner.cells.some(header => {
        const label = header.rawText.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z]/g, '')
        return header.row < headerDepth && header.column <= cell.column && header.column + header.columnSpan > cell.column
          && (/^(stt|tt|sott|so+luong|sotien|dongia|thanhtien(?:sauthue)?|tienthue)$/.test(label) || label === 't' && header.column === 0)
      }))
      let best = reading(await recognizeCanvas(input, value => progress({ ...value, progress: (index + value.progress) / Math.max(1, cells.length) }), numeric, signal, numeric ? '7' : '6'))
      const readings = [best.reading]
      // Keep the previous crop as an independent reading: rectification can blur small print.
      const inset = Math.max(2, original.width / 400), lx = Math.max(0, Math.ceil(Math.min(...points.map(p => p.x)) + inset)), ly = Math.max(0, Math.ceil(Math.min(...points.map(p => p.y)) + inset))
      const lw = Math.min(original.width, Math.floor(Math.max(...points.map(p => p.x)) - inset)) - lx, lh = Math.min(original.height, Math.floor(Math.max(...points.map(p => p.y)) - inset)) - ly
      let legacyPixels: Uint8ClampedArray | undefined
      if (lw >= 8 && lh >= 8) {
        legacy.width = lw + 32; legacy.height = lh + 32
        const lc = legacy.getContext('2d')!
        lc.fillStyle = 'white'; lc.fillRect(0, 0, legacy.width, legacy.height); lc.drawImage(original, lx, ly, lw, lh, 16, 16, lw, lh)
        const lp = lc.getImageData(16, 16, lw, lh); legacyPixels = new Uint8ClampedArray(lp.data)
        lp.data.set(localOcrPixels(lp.data, lw, lh, .12)); lc.putImageData(lp, 16, 16)
        const oldScale = lw < 900 && lh < 160 ? 2 : 1
        if (oldScale > 1) { enlarged.width = legacy.width * oldScale; enlarged.height = legacy.height * oldScale; enlarged.getContext('2d')!.drawImage(legacy, 0, 0, enlarged.width, enlarged.height) }
        const lines = await recognizeCanvas(oldScale > 1 ? enlarged : legacy, () => undefined, numeric, signal, numeric || !best.text ? '7' : '6')
        const candidate = reading(lines.map(line => ({ ...line, words: line.words.filter(word => word.confidence >= 20) })))
        readings.push(candidate.reading)
        // Prefer the established reading unless straightening recovers meaningful missing text.
        const digits = (text: string) => (text.match(/\d/g) ?? []).join('')
        const plain = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
        const suffix = !digits(candidate.text) && /\d\s*$/.test(best.text) && plain(best.text).replace(/\d+$/, '') === plain(candidate.text)
        const recovers = best.confidence >= 65 && (contentLength(best.text) > contentLength(candidate.text) * 1.15 || suffix)
        if (candidate.text && (!recovers && candidate.confidence >= best.confidence - 3
          || contentLength(candidate.text) > contentLength(best.text) * 1.15 && candidate.confidence >= best.confidence - 10)) best = candidate
        if (scale > 1) { enlarged.width = canvas.width * scale; enlarged.height = canvas.height * scale; enlarged.getContext('2d')!.drawImage(canvas, 0, 0, enlarged.width, enlarged.height) }
      }
      for (const mode of ['lighting', 'contrast', 'threshold'] as const) {
        if (cell.row >= headerDepth && best.confidence >= 90 && contentLength(best.text) && best.lines >= expectedLines) break
        pixels.data.set(clearCellRules(mode === 'lighting' ? normalizeOcrLighting(raw, width, height) : mode === 'contrast' ? enhancePixels(raw, 'contrast') : localOcrPixels(raw, width, height, .3), width, height))
        context.putImageData(pixels, 16, 16)
        if (scale > 1) enlarged.getContext('2d')!.drawImage(canvas, 0, 0, enlarged.width, enlarged.height)
        const candidate = reading(await recognizeCanvas(input, () => undefined, numeric, signal, numeric || !best.text ? '7' : '6'))
        readings.push(candidate.reading)
        // Never trade a complete cell for a high-confidence fragment.
        const stableDigits = !/\d{2}/.test(best.text) || (candidate.text.match(/\d/g) ?? []).join('') === (best.text.match(/\d/g) ?? []).join('')
        const fuller = candidate.lines > best.lines && candidate.confidence >= 65 && candidate.confidence >= best.confidence - 10
          && contentLength(candidate.text) > contentLength(best.text) * 1.15
        if (stableDigits && contentLength(candidate.text) >= contentLength(best.text) * .85 && (candidate.confidence > best.confidence + 3 || fuller)) best = candidate
      }
      if (numeric && !/\d/.test(best.text)) {
        pixels.data.set(clearCellRules(localOcrPixels(raw, width, height, .12), width, height)); context.putImageData(pixels, 16, 16)
        if (scale > 1) enlarged.getContext('2d')!.drawImage(canvas, 0, 0, enlarged.width, enlarged.height)
        best = reading(await recognizeCanvas(input, () => undefined, true, signal, '13'))
      }
      if (!numeric && (cell.row < headerDepth || best.confidence < 90 || best.lines < expectedLines)) {
        const lineReadings = await readOcrCellLines(legacyPixels ?? raw, legacyPixels ? lw : width, legacyPixels ? lh : height, signal)
        for (const lines of lineReadings) {
          const candidate = reading(lines); readings.push(candidate.reading)
          const complete = contentLength(candidate.text) >= contentLength(best.text) * .8
          const fuller = candidate.lines > best.lines && contentLength(candidate.text) > contentLength(best.text) * 1.1
          if (candidate.confidence >= 80 && complete && (candidate.confidence > best.confidence + 3 || fuller && candidate.confidence >= best.confidence - 8)) best = candidate
        }
      }
      if (numeric && legacyPixels && lw < 300 && lh < 80 && best.confidence < 98) {
        const sharper: ReturnType<typeof reading>[] = []
        const lc = legacy.getContext('2d')!, lp = lc.createImageData(lw, lh)
        for (const mode of ['lighting', 'threshold'] as const) {
          lp.data.set(mode === 'lighting' ? normalizeOcrLighting(legacyPixels, lw, lh) : localOcrPixels(legacyPixels, lw, lh, .12))
          lc.putImageData(lp, 16, 16)
          enlarged.width = legacy.width * 4; enlarged.height = legacy.height * 4
          enlarged.getContext('2d')!.drawImage(legacy, 0, 0, enlarged.width, enlarged.height)
          const candidate = reading(await recognizeCanvas(enlarged, () => undefined, true, signal, '7'))
          readings.push(candidate.reading); sharper.push(candidate)
        }
        const digits = (value: string) => (value.match(/\d/g) ?? []).join('')
        for (const candidate of sharper) {
          const consensus = digits(candidate.text) && sharper.filter(other => other.confidence >= 80 && digits(other.text) === digits(candidate.text)).length >= 2
          if (candidate.confidence >= 85 && contentLength(candidate.text) >= Math.max(1, contentLength(best.text) * .85)
            && (candidate.confidence > best.confidence + 3 || consensus && candidate.confidence >= best.confidence - 3)) best = candidate
        }
      }
      best = reading(refineOcrLineMarks(best.reading, readings))
      const digits = (text: string) => (text.match(/\d/g) ?? []).join('')
      const source = sourceWords.filter(word => cell.wordIds.includes(word.id))
      const sourceScore = source.reduce((sum, word) => sum + word.confidence * contentLength(word.rawText), 0) / Math.max(1, source.reduce((sum, word) => sum + contentLength(word.rawText), 0))
      const agreedDigits = Boolean(digits(best.text)) && readings.filter(lines => { const candidate = reading(lines); return candidate.confidence >= 80 && digits(candidate.text) === digits(best.text) }).length >= 2
      const codeDigits = (text: string) => (text.match(/[A-Za-zĐđ]{2,}[A-Za-zĐđ\d./_-]*\d[A-Za-zĐđ\d./_-]*/g) ?? []).map(digits).join('|')
      const damagesCode = codeDigits(cell.rawText) !== '' && codeDigits(cell.rawText) !== codeDigits(best.text)
      const changesIdentifier = !numeric && (damagesCode || /\d{2}/.test(cell.rawText) && digits(cell.rawText) !== digits(best.text) && !agreedDigits)
        && (!source.length || best.confidence < 90 || best.confidence < sourceScore - 2)
      const changesConfidentNumber = numeric && /^\s*\d[\d.,%\s]*$/.test(cell.rawText) && sourceScore >= 85
        && digits(cell.rawText) !== digits(best.text) && (!agreedDigits || best.confidence < sourceScore + 3)
      const key = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
      const recoveredSuffix = !digits(cell.rawText) && /\d\s*$/.test(best.text) && key(best.text).replace(/\d+$/, '') === key(cell.rawText)
      const recoveredPrefix = key(cell.rawText).length >= 8 && key(best.text).endsWith(key(cell.rawText)) && key(best.text).length > key(cell.rawText).length
      const improvesSource = !source.length || numeric || best.confidence >= sourceScore + 3 || best.confidence >= 90 && best.confidence >= sourceScore - 2
        || best.confidence >= 65 && (contentLength(best.text) > contentLength(cell.rawText) * 1.15 || recoveredSuffix || recoveredPrefix)
      if (improvesSource && !changesIdentifier && !changesConfidentNumber && best.confidence >= 45 && contentLength(best.text) > 0 && (numeric || contentLength(cell.rawText) < 3 || contentLength(best.text) >= Math.max(3, contentLength(cell.rawText) * .85))) cell.rawText = best.text
      else cell.rawText = cell.rawText.replace(/^[|¦\s]+|[|¦\s]+$/g, '').split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).join(' ')
    } finally { canvas.width = canvas.height = enlarged.width = enlarged.height = legacy.width = legacy.height = 1 }
  }
  signal.throwIfAborted()
  return result
}
