import { describe, expect, it } from 'vitest'
import type { OcrDocumentText, OcrEditableDocument } from '../types/ocr-document.types'
import { DEFAULT_OCR_STYLE, documentPlainText } from './ocr-document'
import { normalizeOcrDocument } from './ocr-document-normalize'
import { layoutOcrDocument } from './ocr-document-layout'

const measure = (text: string, style: { fontSize: number }) => text.length * style.fontSize * .5
const text = (id: string, value: string, x: number, y: number, fontSize: number, width = 400): OcrDocumentText => ({
  ...DEFAULT_OCR_STYLE, kind: 'text', id, text: value, x, y, width, fontSize, height: fontSize * 1.2, bold: fontSize > 13,
  referenceLines: [{ text: value, width }],
})
const document = (blocks: OcrEditableDocument['pages'][number]['blocks']): OcrEditableDocument => ({ version: 1, pages: [{ id: 'p', width: 595, height: 842, blocks }] })

describe('clean OCR document reconstruction', () => {
  it('keeps fragments of a right-hand signature together instead of stretching them across the sheet', () => {
    const source = document([{ id: 'grid', kind: 'table', x: 40, y: 100, width: 500, height: 60, rows: [30, 30], columns: [250, 250], cells: [] },
      text('signature', 'Signed by COMPANY', 350, 300, 11, 80), text('continuation', 'LIMITED', 465, 300, 11, 70)])
    const blocks = normalizeOcrDocument(source).pages[0].blocks
    expect(blocks[1].x).toBeGreaterThan(595 / 2)
    expect(blocks[2].x).toBeGreaterThan(blocks[1].x + blocks[1].width)
    expect(blocks[2].y).toBe(blocks[1].y)
  })

  it('fits a dense nine-column invoice on one page without losing its rows or party fields', () => {
    const labels = ['STT', 'Description', 'Unit', 'Quantity', 'Price', 'Amount', 'Tax', 'Tax amount', 'Total']
    const source = document([
      ...Array.from({ length: 22 }, (_, i) => text(`party-${i}`, `Party field ${i}: document information`, 40, 20 + i * 10, 8)),
      { id: 'grid', kind: 'table', x: 40, y: 250, width: 500, height: 150, rows: Array(9).fill(17), columns: [26, 130, 45, 35, 50, 65, 31, 62, 56], cells: labels.map((label, i) => ({ ...DEFAULT_OCR_STYLE, id: `cell-${i}`, row: 0, column: i, rowSpan: 1, columnSpan: 1, text: label })) },
      ...Array.from({ length: 12 }, (_, i) => text(`summary-${i}`, `Summary field ${i}: document information`, 40, 410 + i * 10, 8)),
    ])
    const normalized = normalizeOcrDocument(source), papers = layoutOcrDocument(normalized, measure)
    expect(papers).toHaveLength(1)
    expect(documentPlainText(normalized)).toEqual(documentPlainText(source))
    expect(papers[0].borders).toHaveLength(9)
    expect(papers[0].fragments.filter(fragment => fragment.cellId)).toHaveLength(9)
  })

  it('does not merge adjacent party details or signature labels on a form with a table', () => {
    const table: OcrEditableDocument['pages'][number]['blocks'][number] = { id: 't', kind: 'table', x: 40, y: 170, width: 500, height: 40, rows: [20, 20], columns: [500], cells: [] }
    const source = document([text('party', 'Delivering party: Company', 40, 90, 11), text('address', 'Address: First address', 40, 104, 11), table,
      text('left', 'Delivering representative', 50, 230, 11, 200), text('right', 'Receiving representative', 320, 230, 11, 200)])
    const normalized = normalizeOcrDocument(source), blocks = normalized.pages[0].blocks
    expect(blocks).toHaveLength(5)
    expect(blocks[0]).toMatchObject({ text: 'Delivering party: Company', fontSize: 11 })
    expect(blocks[1]).toMatchObject({ text: 'Address: First address', fontSize: 11 })
    expect(blocks[3]).toMatchObject({ align: 'center' })
    expect(blocks[4]).toMatchObject({ align: 'center', y: blocks[3].y })
  })
  it('removes perspective size and margin drift without inventing headings from nearer body text', () => {
    const source = document([
      text('top', '- Far paragraph with small photographed letters and the same body style.', 110, 80, 8),
      text('middle', '- Middle paragraph of the document with regular body text.', 80, 220, 11),
      text('bottom', '- Near paragraph with larger photographed letters and the same body style.', 40, 450, 17),
      text('continuation', 'Another ordinary paragraph that only looks large because it is nearer the camera.', 35, 550, 17),
    ])
    const result = normalizeOcrDocument(source), blocks = result.pages[0].blocks as OcrDocumentText[]
    expect(new Set(blocks.map(block => block.fontSize))).toEqual(new Set([11]))
    expect(new Set(blocks.map(block => block.x)).size).toBe(1)
    expect(new Set(blocks.map(block => block.width)).size).toBe(1)
    expect(blocks.every(block => !block.bold && block.indent === 0 && block.lineHeight === 1.3 && !block.referenceLines)).toBe(true)
    expect(documentPlainText(result)).toEqual(documentPlainText(source))
    expect(source.pages[0].blocks[0]).toMatchObject({ fontSize: 8, x: 110 })
    const papers = layoutOcrDocument(result, measure), fragments = papers.flatMap(paper => paper.fragments)
    for (let i = 1; i < fragments.length; i++) expect(fragments[i].y).toBeCloseTo(fragments[i - 1].y + fragments[i - 1].height + 4)
  })

  it('keeps real titles and section headings, then rejoins perspective-split body lines', () => {
    const source = document([
      text('title', 'EMPLOYMENT CONTRACT', 130, 30, 24, 300),
      text('section', '3. Quyền hạn: .', 100, 90, 13),
      text('body', '- First part of a wrapped paragraph with perspective.', 90, 130, 12),
      text('wrapped', 'Continuation of that same paragraph at a different apparent size.', 85, 147, 15),
      text('next', '- The next list item must remain separate.', 80, 180, 15),
    ])
    const result = normalizeOcrDocument(source), blocks = result.pages[0].blocks
    expect(blocks).toHaveLength(4)
    expect(blocks[0]).toMatchObject({ fontSize: 16, bold: true })
    expect(blocks[1]).toMatchObject({ fontSize: 11, bold: true, text: '3. Quyền hạn: .' })
    expect(blocks[2]).toMatchObject({ fontSize: 11, bold: false, text: '- First part of a wrapped paragraph with perspective. Continuation of that same paragraph at a different apparent size.' })
    expect(blocks[3]).toMatchObject({ text: '- The next list item must remain separate.' })
  })

  it('does not promote uncased scripts or short OCR artifacts to large bold titles', () => {
    const result = normalizeOcrDocument(document([text('chinese', '没有大小写的正文不能当作大写标题', 50, 100, 11), text('artifact', '^^.', 50, 200, 24)]))
    expect(result.pages[0].blocks.every(block => block.kind === 'text' && block.fontSize === 11 && !block.bold)).toBe(true)
  })

  it('straightens table geometry while retaining cells, spans and editable column proportions', () => {
    const source = document([{ id: 'table', kind: 'table', x: 90, y: 150, width: 350, height: 110, columns: [100, 250], rows: [30, 80], cells: [
      { ...DEFAULT_OCR_STYLE, id: 'heading', row: 0, column: 0, rowSpan: 1, columnSpan: 2, text: 'Merged header', fontSize: 9 },
      { ...DEFAULT_OCR_STYLE, id: 'left', row: 1, column: 0, rowSpan: 1, columnSpan: 1, text: '1', fontSize: 16 },
      { ...DEFAULT_OCR_STYLE, id: 'right', row: 1, column: 1, rowSpan: 1, columnSpan: 1, text: 'A long cell value '.repeat(12) },
    ] }, text('tail', '- Final paragraph after the table.', 40, 350, 17)])
    const result = normalizeOcrDocument(source), table = result.pages[0].blocks[0]
    if (table.kind !== 'table') throw Error('table')
    expect(table.cells[0]).toMatchObject({ columnSpan: 2, text: 'Merged header' })
    expect(table.cells.every(cell => cell.fontSize === 11)).toBe(true)
    expect(table.columns[0] / table.columns[1]).toBeCloseTo(.4)
    expect(new Set(table.rows).size).toBe(1)
    const paper = layoutOcrDocument(result, measure)[0]
    const tail = paper.fragments.find(fragment => fragment.blockId === 'tail')!
    expect(tail.y).toBeGreaterThan(Math.max(...paper.borders.map(border => border.y + border.height)))
    expect(tail.x).toBe(table.x)
    expect(documentPlainText(result)).toEqual(documentPlainText(source))
  })

  it('preserves clearly separate columns and paginates long content within clean margins', () => {
    const source = document([text('left', 'LEFT COLUMN', 40, 40, 11, 200), text('right', 'RIGHT COLUMN', 300, 40, 11, 200), text('long', '- Long paragraph '.repeat(500), 30, 200, 16)])
    const result = normalizeOcrDocument(source)
    expect(result.pages[0].blocks[0].y).toBe(result.pages[0].blocks[1].y)
    expect(result.pages[0].blocks[0].x + result.pages[0].blocks[0].width).toBeLessThan(result.pages[0].blocks[1].x)
    const papers = layoutOcrDocument(result, measure), margin = result.pages[0].margin!
    expect(papers.length).toBeGreaterThan(1)
    expect(papers.flatMap(paper => paper.fragments.filter(fragment => fragment.blockId === 'long').flatMap(fragment => fragment.lines.map(line => line.text))).join(' ').replace(/\s+/g, ' ').trim()).toBe(source.pages[0].blocks[2].kind === 'text' ? source.pages[0].blocks[2].text.trim() : '')
    for (const paper of papers) for (const fragment of paper.fragments) expect(fragment.lines.every(line => line.y >= margin && line.y + fragment.fontSize * fragment.lineHeight <= paper.height - margin + .01)).toBe(true)
  })
})
