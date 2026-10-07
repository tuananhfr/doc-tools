import type { OcrWordResult } from '../types/ocr-result.types'

export function wordBounds(word: Pick<OcrWordResult, 'bbox'>) {
  const xs = word.bbox.map(point => point.x), ys = word.bbox.map(point => point.y)
  const x = Math.min(...xs), y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export function overlapWords(left: Pick<OcrWordResult, 'bbox'>, right: Pick<OcrWordResult, 'bbox'>): number {
  const a = wordBounds(left), b = wordBounds(right)
  const intersection = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y))
  return intersection / Math.max(1e-8, Math.min(a.width * a.height, b.width * b.height))
}

export function alignWords(reference: OcrWordResult[], alternative: OcrWordResult[]) {
  const matches = reference.map(word => alternative.map((candidate, index) => ({ candidate, index })).filter(({ candidate }) => overlapWords(word, candidate) >= 0.5))
  const used = new Set(matches.flatMap(group => group.map(item => item.index)))
  return { matches, unmatched: alternative.filter((_, index) => !used.has(index)) }
}
