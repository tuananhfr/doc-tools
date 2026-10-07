import type { GrayImage } from './scan-analysis'
import type { OcrCell, OcrTable } from '../types/ocr-layout.types'
import type { OcrWordResult } from '../types/ocr-result.types'
import type { Point } from './page-geometry'
import type { Quad } from '../types/text-layer.types'
import { rulingLines } from './ocr-image-variants'

export function tableFromGrid(image: GrayImage, words: OcrWordResult[], toBase: (point: Point) => Point): OcrTable | null {
  const grid = rulingLines(image)
  if (grid.rows.length < 3 || grid.columns.length < 2 || grid.rows.length > 65 || grid.columns.length > 17) return null
  const rows = grid.rows.length - 1, columns = grid.columns.length - 1
  const cells: OcrCell[] = []
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const x0 = grid.columns[column], x1 = grid.columns[column + 1], y0 = grid.rows[row], y1 = grid.rows[row + 1]
    const inCell = words.filter(word => {
      const centerX = (word.previewBox.x + word.previewBox.width / 2) * image.width, centerY = (word.previewBox.y + word.previewBox.height / 2) * image.height
      return centerX >= x0 && centerX < x1 && centerY >= y0 && centerY < y1
    })
    cells.push({ id: `table-0:${row}:${column}`, row, column, rowSpan: 1, columnSpan: 1, bbox: [{ x: x0, y: y0 }, { x: x1, y: y0 }, { x: x1, y: y1 }, { x: x0, y: y1 }].map(toBase) as Quad,
      wordIds: inCell.map(word => word.id), rawText: inCell.map(word => word.rawText).join(' '), verified: null })
  }
  // Missing local separators imply a merge, even when that separator exists in other rows.
  for (let row = 0; row < rows; row++) for (let column = columns - 2; column >= 0; column--) {
    const x = Math.round(grid.columns[column + 1]), y0 = Math.ceil(grid.rows[row] + 3), y1 = Math.floor(grid.rows[row + 1] - 3)
    let ink = 0
    for (let y = y0; y <= y1; y++) if (image.data[y * image.width + x] < 180) ink++
    if (ink / Math.max(1, y1 - y0 + 1) > 0.45) continue
    const left = cells.find(cell => cell.row === row && cell.column === column), rightIndex = cells.findIndex(cell => cell.row === row && cell.column === column + 1)
    if (!left || rightIndex < 0) continue
    const right = cells[rightIndex]
    left.columnSpan += right.columnSpan
    left.bbox = [left.bbox[0], right.bbox[1], right.bbox[2], left.bbox[3]]
    left.wordIds.push(...right.wordIds); left.rawText = [left.rawText, right.rawText].filter(Boolean).join(' ')
    cells.splice(rightIndex, 1)
  }
  for (let row = rows - 2; row >= 0; row--) for (let column = 0; column < columns; column++) {
    const top = cells.find(cell => cell.row === row && cell.column === column)
    const bottomIndex = cells.findIndex(cell => cell.row === row + 1 && cell.column === column && cell.columnSpan === top?.columnSpan)
    if (!top || bottomIndex < 0) continue
    const y = Math.round(grid.rows[row + 1]), x0 = Math.ceil(grid.columns[column] + 3), x1 = Math.floor(grid.columns[column + top.columnSpan] - 3)
    let ink = 0
    for (let x = x0; x <= x1; x++) if (image.data[y * image.width + x] < 180) ink++
    if (ink / Math.max(1, x1 - x0 + 1) > 0.45) continue
    const bottom = cells[bottomIndex]
    top.rowSpan += bottom.rowSpan; top.bbox = [top.bbox[0], top.bbox[1], bottom.bbox[2], bottom.bbox[3]]
    top.wordIds.push(...bottom.wordIds); top.rawText = [top.rawText, bottom.rawText].filter(Boolean).join(' ')
    cells.splice(bottomIndex, 1)
  }
  return { id: 'table-0', rows, columns, cells, origin: 'ruled', verifiedAt: null }
}

export function tableFromWords(words: OcrWordResult[]): OcrTable | null {
  const lines = new Map<string, OcrWordResult[]>()
  for (const word of words) { const id = word.id.split(':')[0]; lines.set(id, [...(lines.get(id) ?? []), word]) }
  const groups = [...lines.values()]
  if (groups.length < 2) return null
  const columns: number[] = []
  for (const group of groups) for (const word of group) {
    const x = word.previewBox.x
    if (!columns.some(value => Math.abs(value - x) < 0.035)) columns.push(x)
  }
  columns.sort((a, b) => a - b)
  if (columns.length < 2 || columns.length > 16) return null
  const cells = groups.flatMap((group, row) => columns.map((x, column) => {
    const inCell = group.filter(word => Math.abs(word.previewBox.x - x) < 0.035)
    const bbox = inCell[0]?.bbox ?? group[0].bbox
    return { id: `table-0:${row}:${column}`, row, column, rowSpan: 1, columnSpan: 1, bbox, wordIds: inCell.map(word => word.id), rawText: inCell.map(word => word.rawText).join(' '), verified: null }
  }))
  return { id: 'table-0', rows: groups.length, columns: columns.length, cells, origin: 'geometry', verifiedAt: null }
}
