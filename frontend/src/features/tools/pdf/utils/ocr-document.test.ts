import { describe, expect, it } from 'vitest'
import type { OcrEditableDocument } from '../types/ocr-document.types'
import { ocrDocumentPage, DEFAULT_OCR_STYLE, documentPlainText } from './ocr-document'
import { layoutOcrDocument } from './ocr-document-layout'
import { detectRuledTables } from './ocr-ruled-tables'
import type { TextRun } from '../types/text-layer.types'

const measure = (text: string, style: { fontSize: number }) => text.length * style.fontSize * .5
const run = (text: string, x: number, y: number, size = 10): TextRun => ({ text, origin: { x, y }, size, width: text.length * size * .5, eol: true, angle: 0, ascent: .8, descent: .2, fontFamily: 'sans-serif', fontName: 'ocr' })

describe('editable OCR document', () => {
  it('retains form field line breaks and separates signature columns around a ruled table', () => {
    const page = ocrDocumentPage({ runs: [run('Delivering party: Company', 30, 30), run('Address: First address', 30, 44),
      { ...run('Company representative', 30, 200), eol: false }, run('Receiving representative', 260, 200)],
      ocr: { layout: { tables: [{ id: 't', origin: 'ruled', rows: 2, columns: 1, cells: [
        { id: 'c', row: 0, column: 0, rowSpan: 1, columnSpan: 1, rawText: 'HEADER', bbox: [{ x: 30, y: 80 }, { x: 280, y: 80 }, { x: 280, y: 100 }, { x: 30, y: 100 }] },
      ] }] } } as NonNullable<import('../types/text-layer.types').PageText['ocr']> }, { width: 500, height: 600 }, 'p')
    const texts = page.blocks.filter(block => block.kind === 'text')
    expect(texts.map(block => block.text)).toEqual(['Delivering party: Company', 'Address: First address', 'Company representative', 'Receiving representative'])
    const table = page.blocks.find(block => block.kind === 'table')!
    expect(table.kind === 'table' && table.cells[0]).toMatchObject({ bold: true, align: 'center' })
  })
  it('keeps question and article headings separate from the preceding answer', () => {
    const page = ocrDocumentPage({ runs: [run('D. Previous answer.', 30, 50), run('Câu 16. New question', 30, 64), run('Continuation of question.', 30, 78), run('A. First answer.', 30, 92), run('Điều 4: New article', 30, 106)] }, { width: 300, height: 400 }, 'p')
    expect(page.blocks).toHaveLength(4)
    expect(page.blocks[1]).toMatchObject({ text: 'Câu 16. New question Continuation of question.' })
    expect(page.blocks[3]).toMatchObject({ text: 'Điều 4: New article' })
  })
  it('preserves heading size, indentation, paragraph positions and every recognized word', () => {
    const page = ocrDocumentPage({ runs: [run('HEADING', 70, 60, 20), run('First line', 35, 100), run('Second line', 30, 114), run('- New paragraph', 30, 150)] }, { width: 300, height: 400 }, 'p')
    expect(page.blocks).toHaveLength(3)
    expect(page.blocks[0]).toMatchObject({ x: 70, fontSize: 20, bold: true })
    expect(page.blocks[1]).toMatchObject({ x: 30, indent: 5, text: 'First line Second line' })
    const document: OcrEditableDocument = { version: 1, pages: [page] }
    expect(documentPlainText(document)[0]).toContain('- New paragraph')
  })

  it('paginates long edits without overlapping lines or dropping any characters', () => {
    const text = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(70), document: OcrEditableDocument = { version: 1, pages: [{ id: 'p', width: 200, height: 220, blocks: [{ ...DEFAULT_OCR_STYLE, kind: 'text', id: 'b', x: 20, y: 30, width: 160, height: 20, text }] }] }
    const papers = layoutOcrDocument(document, measure)
    expect(papers.length).toBeGreaterThan(3)
    expect(papers.flatMap(p => p.fragments.flatMap(f => f.lines.map(l => l.text))).join('')).toBe(text)
    for (const paper of papers) {
      const lines = paper.fragments.flatMap(f => f.lines.map(line => ({ y: line.y, height: f.fontSize * f.lineHeight })))
      expect(lines.every(line => line.y >= 12 && line.y + line.height <= paper.height - 12 + .01)).toBe(true)
      expect(lines.every((line, i) => !i || line.y >= lines[i - 1].y + lines[i - 1].height - .01)).toBe(true)
    }
  })

  it('grows table rows for edited cells, keeps merged cells and moves following paragraphs down', () => {
    const document: OcrEditableDocument = { version: 1, pages: [{ id: 'p', width: 300, height: 400, blocks: [
      { kind: 'table', id: 'table', x: 20, y: 40, width: 240, height: 40, columns: [120, 120], rows: [20, 20], cells: [
        { ...DEFAULT_OCR_STYLE, id: 'heading', row: 0, column: 0, rowSpan: 1, columnSpan: 2, text: 'MERGED HEADING' },
        { ...DEFAULT_OCR_STYLE, id: 'left', row: 1, column: 0, rowSpan: 1, columnSpan: 1, text: 'long cell content '.repeat(12) },
        { ...DEFAULT_OCR_STYLE, id: 'right', row: 1, column: 1, rowSpan: 1, columnSpan: 1, text: '' },
      ] }, { ...DEFAULT_OCR_STYLE, kind: 'text', id: 'after', x: 20, y: 100, width: 240, height: 15, text: 'AFTER TABLE' },
    ] }] }
    const papers = layoutOcrDocument(document, measure), fragments = papers.flatMap(p => p.fragments)
    expect(fragments.filter(f => f.cellId === 'heading')).toHaveLength(1)
    expect(papers.flatMap(p => p.borders).some(border => border.width === 240)).toBe(true)
    expect(fragments.find(f => f.blockId === 'after')!.y).toBeGreaterThan(200)
    expect(fragments.filter(f => f.cellId === 'left').flatMap(f => f.lines).map(line => line.text).join(' ')).toContain('long cell content')
    expect(fragments.find(f => f.cellId === 'right')!.height).toBeGreaterThan(100)
  })

  it('detects separate small ruled tables without mixing surrounding paragraphs into their grids', () => {
    const width = 400, height = 500, data = new Uint8Array(width * height).fill(255)
    for (const top of [80, 300]) {
      for (const y of [top, top + 35, top + 70]) for (let x = 60; x <= 280; x++) data[y * width + x] = 0
      for (const x of [60, 150, 280]) for (let y = top; y <= top + 70; y++) data[y * width + x] = 0
    }
    const tables = detectRuledTables({ width, height, data }, [], point => point)
    expect(tables).toHaveLength(2)
    expect(tables.every(table => table.rows === 2 && table.columns === 2 && table.cells.length === 4)).toBe(true)
    expect(tables[0].cells[0].bbox[0].y).toBeLessThan(100)
    expect(tables[1].cells[0].bbox[0].y).toBeGreaterThan(280)
  })
  it('keeps every row of a multi-page table inside the output paper boundaries', () => {
    const document: OcrEditableDocument = { version: 1, pages: [{ id: 'p', width: 300, height: 400, blocks: [{ kind: 'table', id: 't', x: 20, y: 40, width: 260, height: 1200, columns: [130, 130], rows: Array(40).fill(30), cells: Array.from({ length: 80 }, (_, i) => ({ ...DEFAULT_OCR_STYLE, id: `c${i}`, row: Math.floor(i / 2), column: i % 2, rowSpan: 1, columnSpan: 1, text: `Cell ${i}: long value that must wrap safely` })) }] }] }
    const papers = layoutOcrDocument(document, measure)
    expect(papers.length).toBeGreaterThan(3)
    const fragments = papers.flatMap(p => p.fragments)
    for (let i = 0; i < 80; i++) expect(fragments.filter(f => f.cellId === `c${i}`).flatMap(f => f.lines).map(l => l.text).join(' ')).toContain(`Cell ${i}:`)
    for (const paper of papers) for (const fragment of paper.fragments) expect(fragment.lines.every(line => line.y >= 12 && line.y + fragment.fontSize * fragment.lineHeight <= paper.height - 12 + .01)).toBe(true)
  })
})
