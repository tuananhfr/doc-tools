import { describe, expect, it } from 'vitest'
import { unzipSync, strFromU8 } from 'fflate'
import { exportReviewedOcr } from './ocr-export'
import { safeCsvValue } from '../utils/ocr-csv'
import { resizeOcrTable } from '../utils/ocr-table-edit'
import type { PageText } from '../types/text-layer.types'
import { ocrWords, confirmOcrWord } from '../utils/ocr-review'

const reviewed = (): PageText => {
  const words = ocrWords([{ bbox: { x0: 10, y0: 10, x1: 80, y1: 30 }, baseline: { x0: 10, y0: 27, x1: 80, y1: 27 }, words: [{ text: 'Đức', confidence: 95, bbox: { x0: 10, y0: 10, x1: 80, y1: 30 } }] }], 1, point => point, { width: 200, height: 100 }).map(word => confirmOcrWord(word, word.rawText))
  const table = resizeOcrTable({ id: 'table-0', rows: 0, columns: 0, cells: [], origin: 'manual', verifiedAt: null }, 2, 2)
  table.verifiedAt = 'test'
  table.cells = table.cells.map((cell, i) => ({ ...cell, verified: { value: ['0012', '=1+1', 'Nguyễn Văn An', '180.000'][i], at: 'test', by: 'local-user' } }))
  return { runs: words.map(word => word.run), ocr: { sourceId: 'sample', sourceHash: 'fixed', pageIndex: 0, engine: 'tesseract', engineVersion: 'test', pass: 'original', words, qualityFlags: [], layout: { regions: [], fields: [], tables: [table] } } }
}
describe('reviewed OCR exports', () => {
  it('escapes CSV formulas and identifier coercion', () => {
    expect(safeCsvValue('0012')).toBe('"\'0012"')
    expect(safeCsvValue(' \t=HYPERLINK("secret")')).toBe('"\' \t=HYPERLINK(""secret"")"')
    expect(safeCsvValue('Nguyễn')).toBe('"Nguyễn"')
  })
  it('writes XLSX cells as strings with no formula and reads identifiers back unchanged', async () => {
    const blob = await exportReviewedOcr([reviewed()], 'xlsx', new AbortController().signal)
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(await blob.arrayBuffer())
    expect(workbook.worksheets[0].getCell('A1').value).toBe('0012')
    expect(workbook.worksheets[0].getCell('B1').value).toBe('=1+1')
    expect(workbook.worksheets[0].getCell('A2').value).toBe('Nguyễn Văn An')
    expect(workbook.worksheets[0].getCell('A1').numFmt).toBe('@')
  })
  it('writes a DOCX table and preserves Vietnamese in its XML', async () => {
    const blob = await exportReviewedOcr([reviewed()], 'docx', new AbortController().signal)
    const entries = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const xml = strFromU8(entries['word/document.xml'])
    expect(xml).toContain('Nguyễn Văn An')
    expect(xml).toContain('0012')
    expect(xml).toContain('<w:tbl>')
    expect(xml).toContain('Đức')
  })
  it('retains source raw words and local verification provenance in JSON', async () => {
    const blob = await exportReviewedOcr([reviewed()], 'json', new AbortController().signal)
    const parsed = JSON.parse(await blob.text())
    expect(parsed.schemaVersion).toBe(2)
    expect(parsed.pages[0].words[0]).toMatchObject({ rawText: 'Đức', verifiedValue: 'Đức', verifiedBy: 'local-user' })
    expect(parsed.pages[0].sourceHash).toBe('fixed')
  })
  it('blocks unconfirmed structured data and respects cancellation', async () => {
    const page = reviewed(); page.ocr!.layout!.tables[0].verifiedAt = null
    await expect(exportReviewedOcr([page], 'xlsx', new AbortController().signal)).rejects.toThrow('OCR_LAYOUT_REVIEW_REQUIRED')
    const abort = new AbortController(); abort.abort()
    await expect(exportReviewedOcr([reviewed()], 'docx', abort.signal)).rejects.toThrow()
  })
})
