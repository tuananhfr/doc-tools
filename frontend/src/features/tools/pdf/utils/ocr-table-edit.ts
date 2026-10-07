import type { OcrCell, OcrTable } from '../types/ocr-layout.types'
import type { Quad } from '../types/text-layer.types'

const EMPTY_BOX: Quad = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 30 }, { x: 0, y: 30 }]
export function resizeOcrTable(table: OcrTable, rows: number, columns: number): OcrTable {
  if (!Number.isInteger(rows) || !Number.isInteger(columns) || rows < 1 || rows > 64 || columns < 1 || columns > 16) return table
  const cells: OcrCell[] = table.cells.filter(cell => cell.row < rows && cell.column < columns).map(cell => ({ ...cell, rowSpan: Math.min(cell.rowSpan, rows - cell.row), columnSpan: Math.min(cell.columnSpan, columns - cell.column) }))
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    if (cells.some(cell => row >= cell.row && row < cell.row + cell.rowSpan && column >= cell.column && column < cell.column + cell.columnSpan)) continue
    cells.push({ id: `${table.id}:${row}:${column}`, row, column, rowSpan: 1, columnSpan: 1, bbox: EMPTY_BOX, wordIds: [], rawText: '', verified: null })
  }
  return { ...table, rows, columns, cells: cells.sort((a, b) => a.row - b.row || a.column - b.column), verifiedAt: null }
}

export function mergeOcrCells(table: OcrTable, id: string, direction: 'right' | 'down' = 'right'): OcrTable {
  const cell = table.cells.find(item => item.id === id)
  const next = cell && table.cells.find(item => direction === 'right' ? item.row === cell.row && item.column === cell.column + cell.columnSpan && item.rowSpan === cell.rowSpan : item.column === cell.column && item.row === cell.row + cell.rowSpan && item.columnSpan === cell.columnSpan)
  if (!cell || !next) return table
  const merged = { ...cell, columnSpan: direction === 'right' ? cell.columnSpan + next.columnSpan : cell.columnSpan, rowSpan: direction === 'down' ? cell.rowSpan + next.rowSpan : cell.rowSpan, bbox: (direction === 'right' ? [cell.bbox[0], next.bbox[1], next.bbox[2], cell.bbox[3]] : [cell.bbox[0], cell.bbox[1], next.bbox[2], next.bbox[3]]) as Quad,
    wordIds: [...cell.wordIds, ...next.wordIds], rawText: [cell.rawText, next.rawText].filter(Boolean).join(' '),
    verified: { value: [cell.verified?.value ?? cell.rawText, next.verified?.value ?? next.rawText].filter(Boolean).join(' '), at: new Date().toISOString(), by: 'local-user' as const } }
  return { ...table, cells: table.cells.filter(item => item.id !== next.id).map(item => item.id === id ? merged : item), verifiedAt: null }
}

export function splitOcrCell(table: OcrTable, id: string): OcrTable {
  const cell = table.cells.find(item => item.id === id)
  if (!cell) return table
  return resizeOcrTable({ ...table, cells: table.cells.map(item => item.id === id ? { ...item, rowSpan: 1, columnSpan: 1 } : item) }, table.rows, table.columns)
}
