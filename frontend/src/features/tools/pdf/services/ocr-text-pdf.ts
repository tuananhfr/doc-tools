import { PDFDocument } from 'pdf-lib'
import type { ImageSheet } from '../types/doc-tools.types'
import { layoutOcrText } from '../utils/ocr-text-layout'
import { createFontLoader } from './pdf-fonts'

/** Reflow text only; no original photograph, OCR bitmap or invisible image layer is embedded. */
async function prepare(texts: string[], sheet: ImageSheet, signal: AbortSignal) {
  signal.throwIfAborted()
  const doc = await PDFDocument.create(), font = await createFontLoader(doc)('regular')
  signal.throwIfAborted()
  return { doc, font, layout: layoutOcrText(texts, sheet, (text, size) => font.widthOfTextAtSize(text, size)) }
}

export async function previewOcrTextLayout(texts: string[], sheet: ImageSheet, signal: AbortSignal) {
  return (await prepare(texts, sheet, signal)).layout
}

export async function buildOcrTextPdf(texts: string[], sheet: ImageSheet, signal: AbortSignal) {
  const { doc, font, layout } = await prepare(texts, sheet, signal)
  for (const paper of layout.pages) {
    signal.throwIfAborted()
    const page = doc.addPage([layout.width, layout.height])
    paper.lines.forEach((line, index) => { if (line) page.drawText(line, { x: layout.margin, y: layout.height - layout.margin - layout.fontSize - index * layout.lineHeight, size: layout.fontSize, font }) })
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  signal.throwIfAborted()
  const bytes = await doc.save()
  signal.throwIfAborted()
  return { blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), pages: doc.getPageCount() }
}
