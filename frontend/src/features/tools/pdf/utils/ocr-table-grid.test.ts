import { describe, expect, it } from 'vitest'
import { tableFromGrid } from './ocr-table-grid'
import { mergeOcrCells, resizeOcrTable, splitOcrCell } from './ocr-table-edit'
import { ocrWords } from './ocr-review'
import type { OcrLine } from './ocr-runs'

describe('OCR grid reconstruction', () => {
  it('detects a local vertical merge while preserving the shared row separator', () => {
    const image = { width: 120, height: 120, data: new Uint8Array(14400).fill(255) }
    for (const y of [10, 40, 70, 100]) for (let x = 5; x <= 115; x++) if (y !== 70 || x >= 30) image.data[y * 120 + x] = 0
    for (const x of [5, 30, 115]) for (let y = 10; y <= 100; y++) image.data[y * 120 + x] = 0
    const table = tableFromGrid(image, [], point => point)!
    expect(table.cells.find(cell => cell.row === 1 && cell.column === 0)?.rowSpan).toBe(2)
    expect(table.cells.some(cell => cell.row === 2 && cell.column === 0)).toBe(false)
    expect(table.rows).toBe(3)
  })
  it('retains blank cells and a heading merged across local missing separators', () => {
    const image = { width: 120, height: 120, data: new Uint8Array(14400).fill(255) }
    for (const y of [10, 40, 70, 100]) for (let x = 5; x <= 115; x++) image.data[y * 120 + x] = 0
    for (const x of [5, 115]) for (let y = 10; y <= 100; y++) image.data[y * 120 + x] = 0
    for (let y = 40; y <= 100; y++) image.data[y * 120 + 60] = 0
    const line: OcrLine = { bbox: { x0: 15, y0: 15, x1: 50, y1: 30 }, baseline: { x0: 15, y0: 28, x1: 50, y1: 28 }, words: [{ text: 'Heading', confidence: 95, bbox: { x0: 15, y0: 15, x1: 50, y1: 30 } }] }
    const words = ocrWords([line], 1, point => point, image)
    const table = tableFromGrid(image, words, point => point)!
    expect(table).toMatchObject({ rows: 3, columns: 2, origin: 'ruled', verifiedAt: null })
    expect(table.cells[0]).toMatchObject({ row: 0, column: 0, columnSpan: 2, rawText: 'Heading' })
    expect(table.cells.filter(cell => cell.rawText === '')).toHaveLength(4)
    expect(table.cells).toHaveLength(5)
  })
  it('keeps rectangular occupancy after resize, merge and split', () => {
    const original = resizeOcrTable({ id: 't', rows: 0, columns: 0, cells: [], origin: 'manual', verifiedAt: null }, 2, 3)
    const merged = mergeOcrCells(original, 't:0:0')
    expect(merged.cells).toHaveLength(5)
    expect(merged.cells[0].columnSpan).toBe(2)
    const split = splitOcrCell(merged, 't:0:0')
    expect(split.cells).toHaveLength(6)
    expect(original.cells).toHaveLength(6)
    expect(resizeOcrTable(split, 1, 1).cells).toHaveLength(1)
  })
})
