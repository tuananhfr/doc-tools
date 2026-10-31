import { describe, expect, it, vi } from 'vitest'
import { PDFDocument, PDFName, PDFRawStream, StandardFonts } from 'pdf-lib'
import type { OcrEditableDocument } from '../types/ocr-document.types'
import { DEFAULT_OCR_STYLE } from '../utils/ocr-document'
vi.mock('./pdf-fonts', () => ({ createFontLoader: (doc: PDFDocument) => () => doc.embedFont(StandardFonts.Helvetica) }))
import { buildOcrDocumentPdf, editOcrDocumentPdf, prepareOcrDocument } from './ocr-document-pdf'

describe('structured white-page PDF', () => {
  const document: OcrEditableDocument = { version: 1, pages: [{ id: 'p', width: 595.28, height: 841.89, blocks: [{ ...DEFAULT_OCR_STYLE, id: 'text', kind: 'text', text: 'EDITABLE HEADING', bold: true, fontSize: 20, x: 60, y: 70, width: 400, height: 30 }, { kind: 'table', id: 't', x: 60, y: 140, width: 400, height: 60, columns: [200, 200], rows: [30, 30], cells: [0, 1, 2, 3].map(i => ({ ...DEFAULT_OCR_STYLE, id: `cell-${i}`, row: Math.floor(i / 2), column: i % 2, rowSpan: 1, columnSpan: 1, text: `CELL ${i}` })) }] }] }
  it('uses the same measured paper geometry for export and editing, without embedding a photo', async () => {
    const signal = new AbortController().signal, preview = await prepareOcrDocument(document, signal), built = await buildOcrDocumentPdf(document, signal)
    const doc = await PDFDocument.load(await built.blob.arrayBuffer())
    expect(doc.getPageCount()).toBe(preview.papers.length)
    expect(preview.papers[0].borders).toHaveLength(4)
    expect(preview.papers[0].fragments[0]).toMatchObject({ x: 60, y: 70, bold: true, fontSize: 20 })
    expect(doc.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image')).toHaveLength(0)
  })
  it('keeps cell edits and structured metadata in the downloadable result without mutating the previous result', async () => {
    const previous = { title: 'PDF', notes: [], output: { name: 'scan.pdf', blob: new Blob(['old']) }, ocrDocument: document }
    const next = structuredClone(document), table = next.pages[0].blocks[1]
    if (table.kind !== 'table') throw Error('table')
    table.cells[0].text = 'CHANGED CELL'
    const result = await editOcrDocumentPdf(previous, next, new AbortController().signal)
    expect(result.text).toContain('CHANGED CELL')
    expect(result.ocrDocument).toBe(next)
    expect(previous.output.blob.size).toBe(3)
    expect(result.output.blob.size).toBeGreaterThan(3)
  })
  it('honors cancellation before rendering any partial document', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(buildOcrDocumentPdf(document, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('preserves manual font size and position when exporting edited content', async () => {
    const source = structuredClone(document), block = source.pages[0].blocks[0]
    if (block.kind !== 'text') throw Error('text')
    block.fontSize = 18; block.x = 50
    const result = await editOcrDocumentPdf({ title: 'PDF', notes: [], output: { name: 'scan.pdf', blob: new Blob() } }, source, new AbortController().signal)
    const preview = await prepareOcrDocument(result.ocrDocument!, new AbortController().signal)
    expect(preview.papers[0].fragments[0]).toMatchObject({ fontSize: 18, x: 50 })
    expect(result.ocrDocument!.pages[0].blocks[0]).toMatchObject({ fontSize: 18, x: 50 })
  })
})
