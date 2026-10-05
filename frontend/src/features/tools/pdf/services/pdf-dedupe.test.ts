import { describe, expect, it } from 'vitest'
import { PDFDict, PDFDocument, PDFName, PDFRawStream, PDFRef } from 'pdf-lib'
import { dedupeObjects } from './pdf-dedupe'

const FONT_FILE = Uint8Array.from({ length: 4000 }, (_, index) => (index * 7) % 251)

/** Một phông Type0 kiểu Word: Font → [CIDFont] → FontDescriptor → FontFile2, cộng ToUnicode và mảng W tách riêng. */
function addFont(doc: PDFDocument, file: Uint8Array = FONT_FILE): PDFRef {
  const { context } = doc
  const fontFile = context.register(context.stream(file, { Length1: file.length }))
  const descriptor = context.register(context.obj({ Type: 'FontDescriptor', FontName: 'ABCDEF+Arial', Flags: 32, FontFile2: fontFile }))
  const widths = context.register(context.obj([3, [278, 556], 10, 20, 500]))
  const info = context.register(context.obj({ Registry: context.obj('Adobe'), Ordering: context.obj('Identity'), Supplement: 0 }))
  const cid = context.register(
    context.obj({ Type: 'Font', Subtype: 'CIDFontType2', BaseFont: 'ABCDEF+Arial', FontDescriptor: descriptor, W: widths, CIDSystemInfo: info }),
  )
  const descendants = context.register(context.obj([cid]))
  const toUnicode = context.register(context.stream(Uint8Array.from([1, 2, 3, 4, 5, 6])))
  return context.register(
    context.obj({ Type: 'Font', Subtype: 'Type0', BaseFont: 'ABCDEF+Arial', Encoding: 'Identity-H', DescendantFonts: descendants, ToUnicode: toUnicode }),
  )
}

function addPage(doc: PDFDocument, font: PDFRef) {
  const page = doc.addPage([300, 400])
  page.node.set(PDFName.of('Resources'), doc.context.obj({ Font: { F1: font } }))
  // Mảng ghi chú rỗng tách riêng, như nhiều trình tạo PDF vẫn ghi.
  page.node.set(PDFName.of('Annots'), doc.context.register(doc.context.obj([])))
  return page
}

function fontOf(doc: PDFDocument, pageIndex: number): PDFRef {
  const fonts = doc.getPage(pageIndex).node.Resources()?.lookup(PDFName.of('Font'), PDFDict)
  return fonts?.get(PDFName.of('F1')) as PDFRef
}

const streams = (doc: PDFDocument) => doc.context.enumerateIndirectObjects().filter(([, object]) => object instanceof PDFRawStream).length

describe('dedupeObjects', () => {
  it('gộp trọn chuỗi phông trùng của hai trang về một bản, tệp lưu ra vẫn mở được', async () => {
    const doc = await PDFDocument.create()
    addPage(doc, addFont(doc))
    addPage(doc, addFont(doc))
    const before = (await doc.save()).length

    const stats = dedupeObjects(doc)
    // FontFile2, ToUnicode, FontDescriptor, W, CIDSystemInfo, CIDFont, DescendantFonts, Font.
    expect(stats.objects).toBe(8)
    expect(stats.bytes).toBe(FONT_FILE.length + 6)
    expect(fontOf(doc, 0)).toBe(fontOf(doc, 1))
    expect(streams(doc)).toBe(2)

    const bytes = await doc.save()
    expect(bytes.length).toBeLessThan(before - FONT_FILE.length)
    const saved = await PDFDocument.load(bytes)
    expect(saved.getPageCount()).toBe(2)
    expect(streams(saved)).toBe(2)
  })

  it('phông khác dữ liệu thì giữ riêng', async () => {
    const doc = await PDFDocument.create()
    addPage(doc, addFont(doc))
    addPage(doc, addFont(doc, FONT_FILE.map((byte, index) => (index === 100 ? byte ^ 1 : byte))))
    const stats = dedupeObjects(doc)
    // Chỉ ToUnicode, W, CIDSystemInfo trùng; chuỗi phía trên FontFile2 khác nhau nên đứng yên.
    expect(stats.objects).toBe(3)
    expect(fontOf(doc, 0)).not.toBe(fontOf(doc, 1))
  })

  it('không gộp trang và mảng ghi chú dù giống hệt nhau', async () => {
    const doc = await PDFDocument.create()
    const font = addFont(doc)
    const first = addPage(doc, font)
    const second = addPage(doc, font)
    expect(dedupeObjects(doc).objects).toBe(0)
    expect(first.node.get(PDFName.of('Annots'))).not.toBe(second.node.get(PDFName.of('Annots')))
    expect(doc.getPageCount()).toBe(2)
  })
})
