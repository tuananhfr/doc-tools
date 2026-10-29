import type { OcrMatrix } from '../types/ocr-profile.types'
import { localOcrAngle, localOcrPixels, ocrStrips, printedOcrSegmentation, uniqueOcrLines } from '../utils/ocr-local'
import type { OcrBox, OcrLine } from '../utils/ocr-runs'
import { invertMatrix, transformPoint } from '../utils/ocr-transform'
import { recognizeCanvas, type OcrProgress } from './ocr'

const characters = (line: OcrLine) => line.words.reduce((sum, word) => sum + word.text.length, 0)
const confidence = (line: OcrLine) => line.words.reduce((sum, word) => sum + word.confidence * word.text.length, 0) / Math.max(1, characters(line))
const contentLength = (line: OcrLine) => line.words.reduce((sum, word) => sum + word.text.replace(/[^\p{L}\p{N}]/gu, '').length, 0)
const numbers = (line: OcrLine) => line.words.flatMap(word => word.text.match(/\d[\d.,/-]*/g) ?? []).join('|')

async function retryLine(canvas: HTMLCanvasElement, line: OcrLine, signal: AbortSignal) {
  const crop = document.createElement('canvas'), box = line.bbox
  const left = Math.max(0, Math.floor(box.x0 - 4)), top = Math.max(0, Math.floor(box.y0 - 4))
  const width = Math.min(canvas.width, Math.ceil(box.x1 + 4)) - left, height = Math.min(canvas.height, Math.ceil(box.y1 + 4)) - top
  try {
    crop.width = width + 32; crop.height = height + 32
    const context = crop.getContext('2d')!
    context.fillStyle = 'white'; context.fillRect(0, 0, crop.width, crop.height)
    context.drawImage(canvas, left, top, width, height, 16, 16, width, height)
    const candidates = await recognizeCanvas(crop, () => undefined, false, signal, '7'), candidate = candidates[0]
    if (candidates.length !== 1 || contentLength(candidate) < contentLength(line) * .85 || contentLength(candidate) > contentLength(line) * 1.15 || numbers(candidate) !== numbers(line) || confidence(candidate) < confidence(line) + 5) return line
    const move = (box: OcrBox): OcrBox => ({ x0: box.x0 + left - 16, y0: box.y0 + top - 16, x1: box.x1 + left - 16, y1: box.y1 + top - 16 })
    return { ...candidate, bbox: move(candidate.bbox), baseline: move(candidate.baseline), words: candidate.words.map(word => ({ ...word, bbox: move(word.bbox) })) }
  } finally { crop.width = crop.height = 1 }
}

/** A coherent second reading of printed pages; originals and review provenance remain intact. */
export async function recognizeLocalPrint(original: HTMLCanvasElement, onProgress: (progress: OcrProgress) => void, signal: AbortSignal) {
  const strips = ocrStrips(original.width, original.height), lines: OcrLine[] = [], contextLines: OcrLine[] = []
  let retries = 0
  const regions: { bounds: { x: number; y: number; width: number; height: number }; toOriginal: OcrMatrix }[] = []
  for (const [index, strip] of strips.entries()) {
    signal.throwIfAborted()
    const crop = document.createElement('canvas'), rotated = document.createElement('canvas'), sample = document.createElement('canvas')
    try {
      crop.width = original.width; crop.height = strip.height
      const context = crop.getContext('2d', { willReadFrequently: true })!
      context.drawImage(original, 0, strip.top, crop.width, crop.height, 0, 0, crop.width, crop.height)
      const input = context.getImageData(0, 0, crop.width, crop.height)
      input.data.set(localOcrPixels(input.data, crop.width, crop.height)); context.putImageData(input, 0, 0)
      sample.width = 512; sample.height = Math.max(1, Math.round(crop.height * 512 / crop.width))
      const sampleContext = sample.getContext('2d')!
      sampleContext.drawImage(crop, 0, 0, sample.width, sample.height)
      const pixels = sampleContext.getImageData(0, 0, sample.width, sample.height).data, gray = new Uint8Array(sample.width * sample.height)
      for (let i = 0; i < gray.length; i++) gray[i] = Math.max(pixels[i * 4], pixels[i * 4 + 1], pixels[i * 4 + 2])
      const angle = localOcrAngle({ width: sample.width, height: sample.height, data: gray }) * Math.PI / 180
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const padX = Math.max(Math.ceil(original.width * 80 / 1282), Math.ceil((Math.abs(crop.width * cos) + Math.abs(crop.height * sin) - crop.width) / 2) + 16)
      const padY = Math.max(Math.ceil(original.width * 100 / 1282), Math.ceil((Math.abs(crop.width * sin) + Math.abs(crop.height * cos) - crop.height) / 2) + 16)
      rotated.width = crop.width + padX * 2; rotated.height = crop.height + padY * 2
      const fromOriginal: OcrMatrix = [cos, -sin, rotated.width / 2 - cos * crop.width / 2 + sin * (crop.height / 2 + strip.top), sin, cos, rotated.height / 2 - sin * crop.width / 2 - cos * (crop.height / 2 + strip.top), 0, 0, 1]
      const toOriginal = invertMatrix(fromOriginal), target = rotated.getContext('2d')!
      target.fillStyle = 'white'; target.fillRect(0, 0, rotated.width, rotated.height)
      target.translate(rotated.width / 2, rotated.height / 2); target.rotate(angle); target.drawImage(crop, -crop.width / 2, -crop.height / 2)
      // A photo's upper band can contain a folded neighboring sheet or header.
      // Let layout detection separate these instead of forcing one text block.
      const segmentation = index === 0 ? '3' : printedOcrSegmentation(angle * 180 / Math.PI)
      const found = await recognizeCanvas(rotated, progress => onProgress({ ...progress, progress: (index + progress.progress) / strips.length }), false, signal, segmentation)
      signal.throwIfAborted()
      const point = (x: number, y: number) => transformPoint(toOriginal, { x, y })
      const box = (value: OcrBox): OcrBox => {
        const corners = [point(value.x0, value.y0), point(value.x1, value.y0), point(value.x1, value.y1), point(value.x0, value.y1)]
        return { x0: Math.max(0, Math.min(...corners.map(p => p.x))), y0: Math.max(0, Math.min(...corners.map(p => p.y))), x1: Math.min(original.width, Math.max(...corners.map(p => p.x))), y1: Math.min(original.height, Math.max(...corners.map(p => p.y))) }
      }
      for (let line of found) {
        // Clear overlap readings can fill a missing line. They must not replace
        // a reading already found in its owning strip.
        const center = point((line.bbox.x0 + line.bbox.x1) / 2, (line.bbox.y0 + line.bbox.y1) / 2)
        const owned = center.y >= strip.start && center.y < strip.end
        if (!owned && (characters(line) < 10 || confidence(line) < 90)) continue
        if (owned && retries < 8 && characters(line) >= 10 && confidence(line) < 85) {
          retries++; line = await retryLine(rotated, line, signal)
        }
        const start = point(line.baseline.x0, line.baseline.y0), end = point(line.baseline.x1, line.baseline.y1)
        const destination = owned ? lines : contextLines
        destination.push({ ...line, bbox: box(line.bbox), baseline: { x0: start.x, y0: start.y, x1: end.x, y1: end.y }, words: line.words.map(word => ({ ...word, bbox: box(word.bbox) })) })
      }
      regions.push({ bounds: { x: 0, y: strip.top, width: crop.width, height: crop.height }, toOriginal })
    } finally { crop.width = rotated.width = sample.width = 1; crop.height = rotated.height = sample.height = 1 }
  }
  signal.throwIfAborted()
  const result = uniqueOcrLines(lines)
  for (const context of contextLines) {
    if (!result.some(line => uniqueOcrLines([line, context], true).length === 1)) result.push(context)
  }
  const row = (line: OcrLine) => {
    const { x0, y0, x1, y1 } = line.baseline
    return x1 === x0 ? (line.bbox.y0 + line.bbox.y1) / 2 : y0 + (original.width / 2 - x0) * (y1 - y0) / (x1 - x0)
  }
  result.sort((a, b) => row(a) - row(b) || a.bbox.x0 - b.bbox.x0)
  return { lines: result, regions }
}
