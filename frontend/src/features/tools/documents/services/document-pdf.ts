import type { PDFPage } from 'pdf-lib'
import type { PrintDocument, DocumentBlock } from '../types/print-document'
import { DOCUMENT_EXPORT_LIMITS, documentCharacterCount } from '../types/print-document'
import { createFontLoader } from '@/features/tools/pdf/services/pdf-fonts'
import { createTextPreparer, type PreparedText } from '@/features/tools/pdf/services/pdf-text'
import type { Rgb } from '@/features/tools/pdf/utils/decorations'

export async function documentPdf(document: PrintDocument): Promise<Blob> {
  if (documentCharacterCount(document) > DOCUMENT_EXPORT_LIMITS.characters) throw new Error('DOCUMENT_TEXT_LIMIT')
  const { PDFDocument, rgb } = await import('pdf-lib')
  const pdf = await PDFDocument.create(), prepare = createTextPreparer(pdf, createFontLoader(pdf))
  pdf.setTitle(document.title)
  const margin = 44, bottom = 46, top = 797, pages: PDFPage[] = []
  const accent: Rgb = [parseInt(document.accent.slice(1, 3), 16) / 255, parseInt(document.accent.slice(3, 5), 16) / 255, parseInt(document.accent.slice(5, 7), 16) / 255]
  const ink: Rgb = [0.12, 0.16, 0.21]
  const getPage = (index: number) => {
    while (pages.length <= index) {
      if (pages.length >= DOCUMENT_EXPORT_LIMITS.pages) throw new Error('DOCUMENT_PAGE_LIMIT')
      const page = pdf.addPage([595.276, 841.89]); pages.push(page)
      page.drawRectangle({ x: margin, y: 814, width: 507.276, height: document.layout === 'compact' ? 1 : 3, color: rgb(...accent) })
    }
    return pages[index]
  }
  const draw = (page: PDFPage, line: PreparedText, x: number, y: number, size: number, color: Rgb) => {
    for (const piece of line.pieces) {
      if (piece.kind === 'glyphs') page.drawText(piece.text, { x, y, size, font: piece.font, color: rgb(...color) })
      else page.drawImage(piece.image, { x, y: y - piece.descent, width: piece.width, height: piece.ascent + piece.descent })
      x += piece.width
    }
  }
  async function render(blocks: DocumentBlock[], x: number, width: number, start: number, startIndex = 0) {
    let y = start, index = startIndex
    for (const block of blocks) {
      const size = block.kind === 'title' ? 25 : block.kind === 'heading' ? document.fontSize + 1 : block.kind === 'note' ? 9 : document.fontSize
      const style = { bold: block.kind === 'title' || block.kind === 'heading' || block.kind === 'subtitle', italic: block.kind === 'note', serif: document.font === 'Georgia' }
      const color = block.kind === 'heading' ? accent : ink, spacing = size * (document.layout === 'compact' ? 1.3 : 1.5)
      if (block.kind === 'heading') { y -= 9; if (y < bottom + spacing * 3) { index++; y = top } }
      for (const paragraph of block.text.split('\n')) {
        const lines: PreparedText[] = []
        let text = ''
        for (const word of paragraph.split(/\s+/u)) {
          const candidate = text ? text + ' ' + word : word
          const measured = await prepare(candidate, style, size, color)
          if (measured.width <= width) { text = candidate; continue }
          if (text) { lines.push(await prepare(text, style, size, color)); text = '' }
          for (const character of Array.from(word)) {
            const next = text + character
            if ((await prepare(next, style, size, color)).width > width && text) { lines.push(await prepare(text, style, size, color)); text = character }
            else text = next
          }
        }
        lines.push(await prepare(text || ' ', style, size, color))
        for (const line of lines) {
          if (y < bottom + spacing) { index++; y = top }
          const centered = block.align === 'center' || document.layout === 'centered' && (block.kind === 'title' || block.kind === 'subtitle')
          draw(getPage(index), line, centered ? x + Math.max(0, (width - line.width) / 2) : x, y, size, color); y -= spacing
        }
      }
      y -= block.kind === 'heading' ? 4 : 8
    }
    return { index, y }
  }
  let start = top
  if (document.photo) {
    const image = await import('@/features/tools/image/services/image-codec').then(async codec => {
      const bitmap = await codec.decodeImage(document.photo!)
      try {
        const { canvas, context } = codec.createCanvas({ width: 330, height: 425 })
        try { const scale = Math.max(330 / bitmap.width, 425 / bitmap.height); context.fillStyle = '#fff'; context.fillRect(0, 0, 330, 425); context.drawImage(bitmap, (330 - bitmap.width * scale) / 2, (425 - bitmap.height * scale) / 2, bitmap.width * scale, bitmap.height * scale); return await codec.encodeCanvas(canvas, 'jpeg', .95) } finally { codec.releaseCanvas(canvas) }
      } finally { bitmap.close() }
    })
    const embedded = await pdf.embedJpg(await image.arrayBuffer()); getPage(0).drawImage(embedded, { x: 468, y: 684, width: 79, height: 102 })
    const header = await render(document.blocks.slice(0, 2), margin, 397, start)
    start = Math.min(header.y, 670)
    if (document.sidebar?.length) { await render(document.sidebar, margin, 144, start); await render(document.blocks.slice(2), margin + 164, 343.276, start) }
    else await render(document.blocks.slice(2), margin, 507.276, start)
  } else if (document.sidebar?.length) {
    const header = await render(document.blocks.slice(0, 2), margin, 507.276, start)
    await render(document.sidebar, margin, 144, header.y); await render(document.blocks.slice(2), margin + 164, 343.276, header.y)
  } else await render(document.blocks, margin, 507.276, start)
  const font = await createFontLoader(pdf)('regular')
  for (const [index, page] of pages.entries()) page.drawText(`${index + 1} / ${pages.length}`, { x: margin, y: 24, size: 9, font, color: rgb(.4, .4, .4) })
  return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' })
}
