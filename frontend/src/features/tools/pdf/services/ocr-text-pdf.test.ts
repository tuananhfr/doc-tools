import { describe, expect, it, vi } from 'vitest'
import { PDFDocument, PDFName, PDFRawStream, StandardFonts } from 'pdf-lib'
import { decodePDFRawStream } from 'pdf-lib/cjs/core/streams/decode'
vi.mock('./pdf-fonts', () => ({ createFontLoader: (doc: PDFDocument) => () => doc.embedFont(StandardFonts.Helvetica) }))
import { buildOcrTextPdf } from './ocr-text-pdf'

describe('white-page OCR PDF', () => {
  it('draws visible text without embedding the original photo or any image object', async () => {
    const built = await buildOcrTextPdf(['HELLO WORLD', 'SECOND PAGE'], { paper: 'a4', margin: 0 }, new AbortController().signal)
    const doc = await PDFDocument.load(await built.blob.arrayBuffer())
    expect(doc.getPageCount()).toBe(2)
    expect(doc.getPage(0).getSize()).toEqual({ width: 595.28, height: 841.89 })
    const images = doc.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFRawStream && object.dict.get(PDFName.of('Subtype'))?.toString() === '/Image')
    expect(images).toHaveLength(0)
    const streams = doc.getPages().map(page => {
      const contents = page.node.Contents()!
      const stream = 'asArray' in contents ? doc.context.lookup(contents.asArray()[0]) : contents
      return Buffer.from(decodePDFRawStream(stream as PDFRawStream).decode()).toString('utf8')
    })
    expect(streams[0]).toContain('48454C4C4F20574F524C44')
    expect(streams[0]).not.toContain('3 Tr')
  })
  it('paginates long content and wraps long identifiers without clipping or losing pages', async () => {
    const built = await buildOcrTextPdf([Array.from({ length: 150 }, () => 'Long content line').join('\n') + '\n' + 'a'.repeat(500)], { paper: 'letter', margin: 20 }, new AbortController().signal)
    expect(built.pages).toBeGreaterThan(3)
    const doc = await PDFDocument.load(await built.blob.arrayBuffer())
    expect(doc.getPageCount()).toBe(built.pages)
    expect(doc.getPage(0).getSize()).toEqual({ width: 612, height: 792 })
  })
  it('aborts instead of returning an incomplete PDF', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(buildOcrTextPdf(['text'], { paper: 'a4', margin: 0 }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' })
  })
})
