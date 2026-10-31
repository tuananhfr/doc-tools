import type { OcrLine, OcrBox } from '../utils/ocr-runs'
import { formTextRows } from '../utils/ocr-form-rows'
import { normalizeOcrLighting } from '../utils/ocr-lighting'
import { localOcrPixels } from '../utils/ocr-local'
import { recognizeCanvas } from './ocr'

const confidence = (lines: OcrLine[]) => {
  const words = lines.flatMap(line => line.words)
  return words.reduce((sum, word) => sum + word.confidence * word.text.length, 0) / Math.max(1, words.reduce((sum, word) => sum + word.text.length, 0))
}
const length = (lines: OcrLine[]) => lines.flatMap(line => line.words).reduce((sum, word) => sum + word.text.replace(/[^\p{L}\p{N}]/gu, '').length, 0)

/** An independent line reading can recover fields skipped by block segmentation. */
export async function readOcrFormRows(original: HTMLCanvasElement, bounds: { left: number; top: number; right: number; bottom: number }, signal: AbortSignal) {
  const source = document.createElement('canvas'), crop = document.createElement('canvas'), enlarged = document.createElement('canvas')
  try {
    source.width = bounds.right - bounds.left; source.height = bounds.bottom - bounds.top
    const context = source.getContext('2d', { willReadFrequently: true })!
    context.drawImage(original, bounds.left, bounds.top, source.width, source.height, 0, 0, source.width, source.height)
    const pixels = context.getImageData(0, 0, source.width, source.height), raw = new Uint8ClampedArray(pixels.data)
    const rows = formTextRows(raw, source.width, source.height).filter(row => row.bottom - row.top <= original.height * .12).slice(0, 48)
    const variants = [normalizeOcrLighting(raw, source.width, source.height), localOcrPixels(raw, source.width, source.height, .12)]
    const found: OcrLine[] = []
    for (const row of rows) {
      signal.throwIfAborted()
      let best: OcrLine[] = []
      const w = row.right - row.left, h = row.bottom - row.top, pad = 16
      for (const variant of variants) {
        pixels.data.set(variant)
        context.putImageData(pixels, 0, 0)
        crop.width = w + pad * 2; crop.height = h + pad * 2
        const target = crop.getContext('2d')!; target.fillStyle = 'white'; target.fillRect(0, 0, crop.width, crop.height)
        target.drawImage(source, row.left, row.top, w, h, pad, pad, w, h)
        const scale = Math.min(3, Math.sqrt(1_500_000 / (crop.width * crop.height)))
        enlarged.width = Math.round(crop.width * scale); enlarged.height = Math.round(crop.height * scale)
        enlarged.getContext('2d')!.drawImage(crop, 0, 0, enlarged.width, enlarged.height)
        const lines = await recognizeCanvas(enlarged, () => undefined, false, signal, h > original.height * .045 ? '6' : '7')
        if (!best.length || length(lines) >= length(best) * .95 && confidence(lines) > confidence(best) + 2
          || length(lines) > length(best) * 1.15 && confidence(lines) >= confidence(best) - 4) {
          const move = (box: OcrBox): OcrBox => ({ x0: box.x0 / scale - pad + row.left + bounds.left, y0: box.y0 / scale - pad + row.top + bounds.top, x1: box.x1 / scale - pad + row.left + bounds.left, y1: box.y1 / scale - pad + row.top + bounds.top })
          best = lines.map(line => ({ ...line, bbox: move(line.bbox), baseline: move(line.baseline), words: line.words.map(word => ({ ...word, bbox: move(word.bbox) })), rowAttributes: line.rowAttributes ? { rowHeight: line.rowAttributes.rowHeight / scale, descenders: line.rowAttributes.descenders / scale } : undefined }))
        }
      }
      for (const line of best) {
        const words = line.words.filter(word => {
          if (/^[|¦]+$/.test(word.text)) return false
          const edge = word.bbox.x0 < bounds.left + 20 || word.bbox.x1 > bounds.right - 20
          return !edge || /[\p{L}\p{N}]/u.test(word.text) && (!/^[Il]$/.test(word.text) || word.confidence >= 85)
        })
        if (!words.length) continue
        const clean = { ...line, words, bbox: { x0: Math.min(...words.map(w => w.bbox.x0)), y0: Math.min(...words.map(w => w.bbox.y0)), x1: Math.max(...words.map(w => w.bbox.x1)), y1: Math.max(...words.map(w => w.bbox.y1)) } }
        if (confidence([clean]) >= 65 && length([clean]) >= 1) found.push(clean)
      }
    }
    return found
  } finally { source.width = source.height = crop.width = crop.height = enlarged.width = enlarged.height = 1 }
}
