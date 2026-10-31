import type { OcrLine } from '../utils/ocr-runs'
import { cellInkRows, clearCellRules } from '../utils/ocr-cell-image'
import { localOcrPixels } from '../utils/ocr-local'
import { normalizeOcrLighting } from '../utils/ocr-lighting'
import { enhancePixels } from '../utils/ocr-image-variants'
import { recognizeCanvas } from './ocr'

/** Isolate actual printed rows when a cell-level block read misses a heading or date.
 * Bounded retries use source pixels, never a dictionary or a transcribed template.
 * Returned coordinates are crop-local and are used only for the cell text.
 */
export async function readOcrCellLines(raw: Uint8ClampedArray, width: number, height: number, signal: AbortSignal): Promise<OcrLine[][]> {
  if (width < 12 || height < 12 || width * height > 500_000) return []
  const threshold = clearCellRules(localOcrPixels(raw, width, height, .12), width, height)
  const rows = cellInkRows(threshold, width, height)
  if (!rows.length || rows.length > 6) return []
  const source = document.createElement('canvas'), crop = document.createElement('canvas'), enlarged = document.createElement('canvas')
  const readings: OcrLine[][] = []
  try {
    source.width = width; source.height = height
    const context = source.getContext('2d')!, pixels = context.createImageData(width, height)
    for (const mode of ['threshold', 'lighting', 'contrast'] as const) {
      signal.throwIfAborted()
      pixels.data.set(mode === 'threshold' ? threshold : mode === 'lighting' ? normalizeOcrLighting(raw, width, height) : enhancePixels(raw, 'contrast'))
      context.putImageData(pixels, 0, 0)
      const lines: OcrLine[] = []
      for (const row of rows) {
        signal.throwIfAborted()
        const h = row.bottom - row.top
        crop.width = width + 32; crop.height = h + 32
        const target = crop.getContext('2d')!
        target.fillStyle = 'white'; target.fillRect(0, 0, crop.width, crop.height)
        target.drawImage(source, 4, row.top, width - 8, h, 20, 16, width - 8, h)
        const scale = Math.min(3, Math.sqrt(2_000_000 / (crop.width * crop.height)))
        enlarged.width = Math.max(1, Math.round(crop.width * scale)); enlarged.height = Math.max(1, Math.round(crop.height * scale))
        enlarged.getContext('2d')!.drawImage(crop, 0, 0, enlarged.width, enlarged.height)
        lines.push(...await recognizeCanvas(enlarged, () => undefined, false, signal, '7'))
      }
      readings.push(lines)
    }
    return readings
  } finally { source.width = source.height = crop.width = crop.height = enlarged.width = enlarged.height = 1 }
}
