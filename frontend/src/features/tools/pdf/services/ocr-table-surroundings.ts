import type { OcrTable } from '../types/ocr-layout.types'
import type { OcrLine, OcrBox } from '../utils/ocr-runs'
import type { Point } from '../utils/page-geometry'
import { enhancePixels } from '../utils/ocr-image-variants'
import { localOcrAngle, localOcrPixels } from '../utils/ocr-local'
import { expandedRotation, transformPoint } from '../utils/ocr-transform'
import { recognizeCanvas, type OcrProgress } from './ocr'
import { normalizeOcrLighting } from '../utils/ocr-lighting'
import { refineOcrLineMarks } from '../utils/ocr-refinement'
import { readOcrFormRows } from './ocr-form-rows'
import { mergeFormReadings } from '../utils/ocr-form-reading'

const score = (lines: OcrLine[]) => {
  const words = lines.flatMap(line => line.words), length = words.reduce((sum, word) => sum + word.text.length, 0)
  return words.reduce((sum, word) => sum + word.confidence * word.text.length, 0) / Math.max(1, length)
}
const contentLength = (lines: OcrLine[]) => lines.flatMap(line => line.words).reduce((sum, word) => sum + word.text.replace(/[^\p{L}\p{N}]/gu, '').length, 0)

/** Dense form text needs its own reading: whole-page layout often skips text beside a stamp,
 * joins party details, or drops the left signature heading below a grid. */
export async function readOcrTableSurroundings(original: HTMLCanvasElement, tables: OcrTable[], toPixel: (point: Point) => Point, signal: AbortSignal, progress: (value: OcrProgress) => void) {
  const boxes = tables.map(table => {
    const points = table.cells.flatMap(cell => cell.bbox.map(toPixel))
    const edge = (right: boolean) => {
      const side = table.cells.filter(cell => right ? cell.column + cell.columnSpan === table.columns : cell.column === 0)
        .flatMap(cell => [cell.bbox[right ? 1 : 0], cell.bbox[right ? 2 : 3]].map(toPixel)).sort((a, b) => a.y - b.y)
      const first = side[0], last = side.at(-1)
      return (y: number) => first && last ? first.x + (last.x - first.x) * (y - first.y) / Math.max(1, last.y - first.y) : right ? original.width : 0
    }
    return { top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)), left: edge(false), right: edge(true) }
  }).sort((a, b) => a.top - b.top)
  const bands: { top: number; bottom: number }[] = []
  if (boxes[0]?.top > original.height * .2) bands.push({ top: 0, bottom: Math.floor(boxes[0].top - 2) })
  let bottom = 0
  for (const box of boxes) {
    // Keep the original page reading above the first grid (logos/company headings).
    if (bottom > 0 && box.top - bottom >= 24) bands.push({ top: Math.ceil(bottom + 2), bottom: Math.floor(box.top - 2) })
    bottom = Math.max(bottom, box.bottom)
  }
  if (boxes.length && original.height - bottom >= 24) bands.push({ top: Math.ceil(bottom + 2), bottom: original.height })
  const result: { top: number; bottom: number; lines: OcrLine[] }[] = []
  for (const [index, band] of bands.slice(0, 8).entries()) {
    signal.throwIfAborted()
    const crop = document.createElement('canvas'), sample = document.createElement('canvas'), rotated = document.createElement('canvas')
    try {
      crop.width = original.width; crop.height = band.bottom - band.top
      const context = crop.getContext('2d', { willReadFrequently: true })!
      context.drawImage(original, 0, band.top, crop.width, crop.height, 0, 0, crop.width, crop.height)
      const pixels = context.getImageData(0, 0, crop.width, crop.height), raw = new Uint8ClampedArray(pixels.data)
      pixels.data.set(localOcrPixels(raw, crop.width, crop.height, .12)); context.putImageData(pixels, 0, 0)
      sample.width = Math.min(512, crop.width); sample.height = Math.max(1, Math.round(crop.height * sample.width / crop.width))
      const sc = sample.getContext('2d')!; sc.drawImage(crop, 0, 0, sample.width, sample.height)
      const rgba = sc.getImageData(0, 0, sample.width, sample.height).data, gray = new Uint8Array(sample.width * sample.height)
      for (let i = 0; i < gray.length; i++) gray[i] = rgba[i * 4]
      const angle = localOcrAngle({ width: sample.width, height: sample.height, data: gray })
      const geometry = expandedRotation(crop.width, crop.height, angle), pad = 24
      const scale = Math.min(crop.width < 1400 ? 2 : 1, Math.sqrt(4_000_000 / ((geometry.width + pad * 2) * (geometry.height + pad * 2))))
      rotated.width = (geometry.width + pad * 2) * scale; rotated.height = (geometry.height + pad * 2) * scale
      const target = rotated.getContext('2d')!
      let best: OcrLine[] = []
      const readings: OcrLine[][] = []
      for (const mode of ['threshold', 'lighting', 'contrast'] as const) {
        if (mode !== 'threshold') { pixels.data.set(mode === 'lighting' ? normalizeOcrLighting(raw, crop.width, crop.height) : enhancePixels(raw, 'contrast')); context.putImageData(pixels, 0, 0) }
        target.setTransform(1, 0, 0, 1, 0, 0); target.fillStyle = 'white'; target.fillRect(0, 0, rotated.width, rotated.height)
        const m = geometry.fromOriginal
        target.setTransform(m[0] * scale, m[3] * scale, m[1] * scale, m[4] * scale, (m[2] + pad) * scale, (m[5] + pad) * scale)
        target.drawImage(crop, 0, 0)
        const found = (await recognizeCanvas(rotated, value => progress({ ...value, progress: (index + value.progress) / Math.max(1, bands.length) }), false, signal, '6'))
          .filter(line => score([line]) >= 45 && contentLength([line]) >= 3)
          .map(line => ({ ...line, words: line.words.filter(word => word.confidence >= 15 || score([line]) >= 75) }))
        readings.push(found)
        // Prefer the fuller coherent reading, not scattered words from multiple passes.
        // The soft pass supplies mark alternatives only: it must not replace a
        // whole address/number with new characters while flattening a shadow.
        if (mode !== 'lighting' && (!best.length || contentLength(found) >= contentLength(best) * .9 && score(found) > score(best) + 3
          || contentLength(found) > contentLength(best) * 1.1 && score(found) >= score(best) - 5)) best = found
      }
      best = refineOcrLineMarks(best, readings)
      const point = (x: number, y: number) => { const p = transformPoint(geometry.toOriginal, { x: x / scale - pad, y: y / scale - pad }); return { x: p.x, y: p.y + band.top } }
      const box = (value: OcrBox): OcrBox => {
        const points = [point(value.x0, value.y0), point(value.x1, value.y0), point(value.x1, value.y1), point(value.x0, value.y1)]
        return { x0: Math.min(...points.map(p => p.x)), y0: Math.min(...points.map(p => p.y)), x1: Math.max(...points.map(p => p.x)), y1: Math.max(...points.map(p => p.y)) }
      }
      let lines: OcrLine[] = best.map(line => {
        const start = point(line.baseline.x0, line.baseline.y0), end = point(line.baseline.x1, line.baseline.y1)
        return { ...line, bbox: box(line.bbox), baseline: { x0: start.x, y0: start.y, x1: end.x, y1: end.y },
          rowAttributes: line.rowAttributes ? { rowHeight: line.rowAttributes.rowHeight / scale, descenders: line.rowAttributes.descenders / scale } : undefined,
          words: line.words.map(word => ({ ...word, bbox: box(word.bbox) })) }
      })
      const padding = Math.max(6, original.width * .01)
      const left = Math.max(0, Math.floor(Math.min(...boxes.flatMap(box => [box.left(band.top), box.left(band.bottom)])) - padding))
      const right = Math.min(original.width, Math.ceil(Math.max(...boxes.flatMap(box => [box.right(band.top), box.right(band.bottom)])) + padding))
      if (right - left >= 120 && original.width >= 600) {
        const rows = await readOcrFormRows(original, { ...band, left, right }, signal)
        lines = mergeFormReadings(lines, rows)
      }
      if (score(best) >= 65) result.push({ ...band, lines })
    } finally { crop.width = crop.height = sample.width = sample.height = rotated.width = rotated.height = 1 }
  }
  return result
}
