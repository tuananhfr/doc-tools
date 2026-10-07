import type { OcrLayout } from '../types/ocr-layout.types'
import type { OcrWordResult } from '../types/ocr-result.types'
import type { OcrProfile } from '../types/ocr-profile.types'
import type { GrayImage } from '../utils/scan-analysis'
import type { Point } from '../utils/page-geometry'
import { tableFromGrid, tableFromWords } from '../utils/ocr-table-grid'
import { receiptFields } from '../utils/ocr-field-mapping'

export function detectOcrLayout(words: OcrWordResult[], profile: OcrProfile, image: GrayImage, toBase: (point: Point) => Point): OcrLayout {
  const table = profile === 'table' ? tableFromGrid(image, words, toBase) ?? tableFromWords(words) : null
  const groups = new Map<string, OcrWordResult[]>()
  for (const word of words) { const id = word.id.substring(0, word.id.lastIndexOf(':')); groups.set(id, [...groups.get(id) ?? [], word]) }
  return { regions: [...groups].map(([id, line]) => {
    const points = line.flatMap(word => word.bbox), xs = points.map(point => point.x), ys = points.map(point => point.y)
    return { id: `region:${id}`, kind: 'line', bbox: [{ x: Math.min(...xs), y: Math.min(...ys) }, { x: Math.max(...xs), y: Math.min(...ys) }, { x: Math.max(...xs), y: Math.max(...ys) }, { x: Math.min(...xs), y: Math.max(...ys) }] as import('../types/text-layer.types').Quad, wordIds: line.map(word => word.id) }
  }),
    tables: table ? [table] : [], fields: profile === 'form' ? receiptFields(words) : [],
    ...(profile === 'form' ? { template: { id: 'receipt-vi', version: '1.0.0' } } : {}) }
}
