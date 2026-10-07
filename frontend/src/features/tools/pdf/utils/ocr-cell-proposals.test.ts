import { describe, expect, it } from 'vitest'
import { proposeOcrCells } from './ocr-cell-proposals'
import { confirmOcrTable } from './ocr-review-layout'
import { ocrWords, reviewedPageText } from './ocr-review'
import { resizeOcrTable } from './ocr-table-edit'
import type { OcrPageResult } from '../types/ocr-result.types'

const words = (text: string) => ocrWords([{ bbox: { x0: 10, y0: 5, x1: 70, y1: 20 }, baseline: { x0: 10, y0: 18, x1: 70, y1: 18 }, words: [{ text, confidence: 95, bbox: { x0: 10, y0: 5, x1: 70, y1: 20 } }] }], 1, point => point, { width: 100, height: 30 })
describe('OCR cell alternatives', () => {
  it('keeps original text immutable and blocks an alternative until explicit grid confirmation', () => {
    const original = words('1oo'), alternative = words('100'), grid = resizeOcrTable({ id: 't', origin: 'manual', rows: 0, columns: 0, cells: [], verifiedAt: null }, 1, 1)
    grid.cells[0].rawText = '1oo'; grid.cells[0].wordIds = [original[0].id]
    const proposed = proposeOcrCells(grid, { pass: 'grid', words: alternative, engineVersion: 'test' })
    expect(proposed.cells[0].rawText).toBe('1oo')
    expect(proposed.cells[0].proposal).toMatchObject({ value: '100', pass: 'grid', candidateIds: ['grid:0:0'] })
    const page: OcrPageResult = { sourceId: 's', sourceHash: 'test', pageIndex: 0, engine: 'tesseract', engineVersion: 'test', pass: 'original', qualityFlags: [], words: original, layout: { regions: [], fields: [], tables: [proposed] } }
    expect(() => reviewedPageText(page)).toThrow(/OCR_.*REVIEW_REQUIRED/u)
    const confirmed = confirmOcrTable(page, proposed)
    expect(confirmed.words[0]).toMatchObject({ rawText: '1oo', verifiedValue: '100', verifiedBy: 'local-user' })
    expect(reviewedPageText(confirmed).runs[0].text).toBe('100')
    expect(original[0].verifiedValue).toBeNull()
  })
})
