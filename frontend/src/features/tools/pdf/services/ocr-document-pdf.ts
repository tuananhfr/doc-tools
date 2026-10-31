import { PDFDocument, rgb, type PDFFont } from 'pdf-lib'
import type { FlowResult } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import type { OcrEditableDocument, OcrTextStyle } from '../types/ocr-document.types'
import { layoutOcrDocument } from '../utils/ocr-document-layout'
import { documentPlainText } from '../utils/ocr-document'
import { fontKey } from '../utils/font-style'
import { createFontLoader } from './pdf-fonts'

const key = (style: OcrTextStyle) => fontKey({ serif: style.font === 'serif', bold: style.bold, italic: style.italic, match: true })
export async function prepareOcrDocument(document: OcrEditableDocument, signal: AbortSignal) {
  signal.throwIfAborted()
  const doc = await PDFDocument.create(), load = createFontLoader(doc), fonts = new Map<string, PDFFont>()
  const styles: OcrTextStyle[] = document.pages.flatMap(page => page.blocks.flatMap<OcrTextStyle>(block => block.kind === 'text' ? [block] : block.cells))
  await Promise.all([...new Map(styles.map(style => [key(style), style])).values()].map(async style => { fonts.set(key(style), await load(key(style))) }))
  signal.throwIfAborted()
  const measure = (text: string, style: OcrTextStyle) => fonts.get(key(style))!.widthOfTextAtSize(text, style.fontSize)
  return { doc, fonts, measure, papers: layoutOcrDocument(document, measure) }
}

export async function buildOcrDocumentPdf(document: OcrEditableDocument, signal: AbortSignal) {
  const { doc, fonts, measure, papers } = await prepareOcrDocument(document, signal)
  for (const paper of papers) {
    signal.throwIfAborted()
    const page = doc.addPage([paper.width, paper.height])
    for (const box of paper.borders) page.drawRectangle({ x: box.x, y: paper.height - box.y - box.height, width: box.width, height: box.height, borderWidth: .6, borderColor: rgb(.25, .3, .35) })
    for (const fragment of paper.fragments) for (const line of fragment.lines) {
      if (!line.text) continue
      const length = measure(line.text, fragment), remaining = fragment.width - (line.x - fragment.x) - length
      const shift = fragment.align === 'right' ? remaining : fragment.align === 'center' ? remaining / 2 : 0
      page.drawText(line.text, { x: line.x + Math.max(0, shift), y: paper.height - line.y - fragment.fontSize, size: fragment.fontSize, font: fonts.get(key(fragment)) })
    }
    await new Promise<void>(resolve => setTimeout(resolve, 0))
  }
  const bytes = await doc.save(); signal.throwIfAborted()
  return { blob: new Blob([bytes as Uint8Array<ArrayBuffer>], { type: 'application/pdf' }), pages: papers.length }
}

export async function editOcrDocumentPdf(result: FlowResult, document: OcrEditableDocument, signal: AbortSignal): Promise<FlowResult> {
  const texts = documentPlainText(document)
  if (!texts.some(text => text.trim())) throw new Error(translate('ocr:empty'))
  const built = await buildOcrDocumentPdf(document, signal)
  signal.throwIfAborted()
  return { ...result, ocrDocument: document, text: texts.join('\n\n'), textPages: texts, output: { ...result.output, blob: built.blob, detail: translate('pdf:stage.pageCount', { count: built.pages }) } }
}
