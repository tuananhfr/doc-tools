import type { OcrWordResult } from '../types/ocr-result.types'
import type { Point } from '../utils/page-geometry'
import { ocrWords } from '../utils/ocr-review'
import { recognizeCanvas } from './ocr'
import type { OcrMatrix } from '../types/ocr-profile.types'

export async function numericOcrPass(original: HTMLCanvasElement, words: OcrWordResult[], pxPerPt: number, toBase: (point: Point) => Point, signal: AbortSignal, onProgress: (progress: number) => void) {
  const selected = words.filter(word => /^\d[\d.,/\-+\s]*$/u.test(word.normalizedText)).slice(0, 12), results: OcrWordResult[] = []
  const crops: { targetWordId: string; toOriginal: OcrMatrix }[] = []
  for (const [index, word] of selected.entries()) {
    signal.throwIfAborted()
    const box = word.previewBox, pad = Math.max(4, Math.round(box.height * original.height * 0.3))
    const x = Math.max(0, Math.floor(box.x * original.width - pad)), y = Math.max(0, Math.floor(box.y * original.height - pad))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.min(original.width - x, Math.ceil(box.width * original.width + 2 * pad)))
    canvas.height = Math.max(1, Math.min(original.height - y, Math.ceil(box.height * original.height + 2 * pad)))
    canvas.getContext('2d')!.drawImage(original, x, y, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
    try {
      const lines = await recognizeCanvas(canvas, progress => onProgress((index + progress.progress) / selected.length), true, signal)
      signal.throwIfAborted()
      crops.push({ targetWordId: word.id, toOriginal: [1, 0, x, 0, 1, y, 0, 0, 1] })
      const recognized = ocrWords(lines, pxPerPt, point => toBase({ x: point.x + x / pxPerPt, y: point.y + y / pxPerPt }), canvas)
      results.push(...recognized.map(current => ({ ...current, id: `numeric-${index}:${current.id}`, previewBox: { x: (current.previewBox.x * canvas.width + x) / original.width, y: (current.previewBox.y * canvas.height + y) / original.height, width: current.previewBox.width * canvas.width / original.width, height: current.previewBox.height * canvas.height / original.height } })))
    } finally { canvas.width = 1; canvas.height = 1 }
  }
  return { words: results, targetWordIds: selected.map(word => word.id), crops }
}
