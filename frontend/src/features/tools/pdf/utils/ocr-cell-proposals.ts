import type { OcrTable } from '../types/ocr-layout.types'
import type { OcrPassWords } from './ocr-consensus'
import type { Point } from './page-geometry'
import type { Quad } from '../types/text-layer.types'

const contains = (quad: Quad, point: Point) => {
  const sides = quad.map((a, index) => { const b = quad[(index + 1) % 4]; return (b.x-a.x)*(point.y-a.y)-(b.y-a.y)*(point.x-a.x) })
  return sides.every(value => value >= -1e-6) || sides.every(value => value <= 1e-6)
}
/** Alternative cell values remain proposals until the user confirms the whole grid. */
export function proposeOcrCells(table: OcrTable, pass: OcrPassWords): OcrTable {
  return { ...table, cells: table.cells.map(cell => {
    const words = pass.words.filter(word => contains(cell.bbox, { x: word.bbox.reduce((sum, point) => sum+point.x, 0)/4, y: word.bbox.reduce((sum, point) => sum+point.y, 0)/4 }))
    return { ...cell, proposal: { value: words.map(word => word.rawText).join(' '), pass: pass.pass, candidateIds: words.map(word => `${pass.pass}:${word.id}`) } }
  }) }
}
