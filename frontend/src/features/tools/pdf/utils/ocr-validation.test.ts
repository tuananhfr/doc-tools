import { describe, expect, it } from 'vitest'
import { validOcrDate } from './ocr-date'
import { parseOcrMoney } from './ocr-money'
import { validateOcrFields, validateOcrTable } from './ocr-validation'
import type { OcrField, OcrTable } from '../types/ocr-layout.types'

describe('OCR field validation', () => {
  it('checks calendar dates without accepting JavaScript date rollover', () => {
    expect(validOcrDate('29/02/2024')).toBe(true)
    for (const input of ['29/02/2023', '31/04/2026', '07/1 0/2026', '0/10/2026', '29/02/1900']) expect(validOcrDate(input)).toBe(false)
    expect(validOcrDate('29/02/2000')).toBe(true)
  })
  it('keeps money exact and rejects ambiguous separators without guessing', () => {
    expect(parseOcrMoney('1.250.000 đồng')).toEqual({ value: 1250000n, ambiguous: false })
    expect(parseOcrMoney('9007199254740993')).toEqual({ value: 9007199254740993n, ambiguous: false })
    expect(parseOcrMoney('1,250')).toEqual({ value: null, ambiguous: true })
    expect(parseOcrMoney('12.50')).toEqual({ value: null, ambiguous: true })
    expect(parseOcrMoney('125O000')).toEqual({ value: null, ambiguous: false })
  })
  it('requires critical confirmation and retains identifier leading zeros', () => {
    const fields: OcrField[] = [{ id: 'id', label: 'ID', kind: 'identifier', required: true, wordIds: [], rawText: '0012', verified: null },
      { id: 'date', label: 'Date', kind: 'date', required: true, wordIds: [], rawText: '31/04/2026', verified: { value: '31/04/2026', at: 'test', by: 'local-user' } }]
    expect(validateOcrFields(fields).map(finding => finding.code)).toEqual(['unverified', 'invalid-date'])
    expect(fields[0].rawText).toBe('0012')
  })
  it('warns on arithmetic mismatch without changing values', () => {
    const table = { id: 't', columns: 2, rows: 5, origin: 'manual', verifiedAt: 'test', cells: [
      { id: 'a', row: 2, column: 1, rawText: '160.000' }, { id: 'b', row: 3, column: 1, rawText: '20.000' },
      { id: 'label', row: 4, column: 0, rawText: 'Tổng' }, { id: 'total', row: 4, column: 1, rawText: '180.001' },
    ] } as OcrTable
    expect(validateOcrTable(table).map(finding => finding.code)).toEqual(['sum-mismatch'])
    expect(table.cells.at(-1)?.rawText).toBe('180.001')
  })
  it('blocks invalid date cells even after a whole-table confirmation', () => {
    const table = { id: 't', columns: 2, rows: 1, origin: 'manual', verifiedAt: 'test', cells: [
      { id: 'label', row: 0, column: 0, columnSpan: 1, rawText: 'Ngày', verified: { value: 'Ngày', at: 'test', by: 'local-user' } },
      { id: 'date', row: 0, column: 1, columnSpan: 1, rawText: '31/04/2026', verified: { value: '31/04/2026', at: 'test', by: 'local-user' } },
    ] } as OcrTable
    expect(validateOcrTable(table).map(finding => finding.code)).toContain('invalid-date')
  })
})
