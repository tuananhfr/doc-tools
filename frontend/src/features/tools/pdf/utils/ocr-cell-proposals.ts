import type { OcrTable } from '../types/ocr-layout.types'
import type { OcrPassWords } from './ocr-consensus'
import type { Point } from './page-geometry'
import type { Quad } from '../types/text-layer.types'
import { wordBounds } from './ocr-alignment'

const contains = (quad: Quad, point: Point) => {
  const sides = quad.map((a, index) => { const b = quad[(index + 1) % 4]; return (b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x) })
  return sides.every(value => value >= -1e-6) || sides.every(value => value <= 1e-6)
}
/** Alternative cell values remain proposals until the user confirms the whole grid. */
export function proposeOcrCells(table: OcrTable, pass: OcrPassWords, reference?: OcrPassWords): OcrTable {
  return { ...table, cells: table.cells.map(cell => {
    const words = pass.words.filter(word => contains(cell.bbox, { x: word.bbox.reduce((sum, point) => sum+point.x, 0)/4, y: word.bbox.reduce((sum, point) => sum+point.y, 0)/4 })).sort((left, right) => {
      const a = wordBounds(left), b = wordBounds(right)
      return Math.abs(a.y - b.y) > Math.min(a.height, b.height) / 2 ? a.y - b.y : a.x - b.x
    })
    const fallback = reference?.words.filter(word => word.confidence >= 85 && (/\p{L}{3}/u.test(word.rawText) || /\d/u.test(word.rawText)) && contains(cell.bbox, { x: word.bbox.reduce((sum, point) => sum + point.x, 0) / 4, y: word.bbox.reduce((sum, point) => sum + point.y, 0) / 4 })) ?? []
    const selected = words.length || !fallback.length ? { words, pass: pass.pass } : { words: fallback, pass: reference!.pass }
    return { ...cell, proposal: { value: selected.words.map(word => word.rawText).join(' '), pass: selected.pass, candidateIds: selected.words.map(word => `${selected.pass}:${word.id}`) } }
  }) }
}
