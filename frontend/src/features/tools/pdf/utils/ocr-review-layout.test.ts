import { describe, expect, it } from 'vitest'
import type { OcrPageResult } from '../types/ocr-result.types'
import { resizeOcrTable, mergeOcrCells } from './ocr-table-edit'
import { confirmOcrField, confirmOcrTable } from './ocr-review-layout'

const page = (): OcrPageResult => ({ sourceId: 's', sourceHash: 'test', pageIndex: 0, engine: 'tesseract', engineVersion: 'test', pass: 'original', qualityFlags: [], words: [],
  layout: { regions: [], fields: [], tables: [resizeOcrTable({ id: 'table-0', origin: 'manual', rows: 0, columns: 0, verifiedAt: null, cells: [] }, 2, 2)] } })
describe('structured review text synchronization', () => {
  it('links a missing field to its editable manual word and preserves its raw value', () => {
    const original = page()
    const field = { id: 'name', label: 'Name', kind: 'text' as const, required: true, rawText: '', verified: null, wordIds: [] }
    original.layout!.fields = [field]
    const confirmed = confirmOcrField(original, field, 'Nguyễn Văn An')
    expect(confirmed.layout!.fields[0].wordIds).toEqual(['manual-field:name'])
    expect(confirmed.words[0].verifiedValue).toBe('Nguyễn Văn An')
    expect(confirmed.words[0].rawText).toBe('')
    const edited = confirmOcrField(confirmed, confirmed.layout!.fields[0], 'Nguyễn Văn Bình')
    expect(edited.words).toHaveLength(1)
    expect(edited.words[0].verifiedValue).toBe('Nguyễn Văn Bình')
    expect(edited.layout!.fields[0].rawText).toBe('')
  })
  it('clears previously entered blank-cell text from the generated text layer', () => {
    const original = page(), table = original.layout!.tables[0]
    table.cells[0].verified = { value: '0012', at: 'test', by: 'local-user' }
    const confirmed = confirmOcrTable(original, table)
    expect(confirmed.words[0].verifiedValue).toBe('0012')
    const edited = { ...confirmed.layout!.tables[0], cells: confirmed.layout!.tables[0].cells.map((cell, index) => index ? cell : { ...cell, verified: { value: '', at: 'test', by: 'local-user' as const } }) }
    const cleared = confirmOcrTable(confirmed, edited)
    expect(cleared.words[0].verifiedValue).toBe('')
    expect(confirmed.words[0].verifiedValue).toBe('0012')
  })
  it('removes obsolete manual text after shrinking the grid', () => {
    const original = page(), table = original.layout!.tables[0]
    table.cells[3].verified = { value: '99', at: 'test', by: 'local-user' }
    const confirmed = confirmOcrTable(original, table), resized = resizeOcrTable(confirmed.layout!.tables[0], 1, 1)
    const result = confirmOcrTable(confirmed, resized)
    expect(result.words).toHaveLength(0)
  })
  it('merges and splits rectangular row spans without mutating the original', () => {
    const table = page().layout!.tables[0], merged = mergeOcrCells(table, 'table-0:0:0', 'down')
    expect(merged.cells[0].rowSpan).toBe(2)
    expect(merged.cells).toHaveLength(3)
    expect(table.cells[0].rowSpan).toBe(1)
  })
})
