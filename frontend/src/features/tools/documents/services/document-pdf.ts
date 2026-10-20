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
  // Leave room for ascenders above the name, below the decorative top rule.
  const margin = 44, bottom = 46, top = document.cv && document.layout !== 'band' ? 773 : 797, pages: PDFPage[] = []
  const accent: Rgb = [parseInt(document.accent.slice(1, 3), 16) / 255, parseInt(document.accent.slice(3, 5), 16) / 255, parseInt(document.accent.slice(5, 7), 16) / 255]
  const ink: Rgb = [0.12, 0.16, 0.21]
  const getPage = (index: number) => {
    while (pages.length <= index) {
      if (pages.length >= DOCUMENT_EXPORT_LIMITS.pages) throw new Error('DOCUMENT_PAGE_LIMIT')
      const page = pdf.addPage([595.276, 841.89]); pages.push(page)
      if (document.layout === 'band' && pages.length === 1) {
        const base = document.photo ? 670 : 729
        page.drawRectangle({ x: margin, y: base, width: 507.276, height: 817 - base, color: rgb(.92, .97, .95) })
        page.drawRectangle({ x: margin, y: base, width: 4, height: 817 - base, color: rgb(...accent) })
      }
      if (document.layout === 'sidebar') page.drawRectangle({ x: margin - 8, y: bottom, width: 156, height: (pages.length === 1 ? 717 : top + 16) - bottom, color: rgb(.94, .97, 1) })
      if (document.layout !== 'band') page.drawRectangle({ x: margin, y: 814, width: 507.276, height: document.layout === 'compact' ? 1 : 3, color: rgb(...accent) })
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
  async function render(blocks: DocumentBlock[], x: number, width: number, start: number, startIndex = 0, baseSize = document.fontSize) {
    let y = start, index = startIndex
    for (const block of blocks) {
      const entryInset = document.cv && block.period !== undefined ? (document.layout === 'compact' ? 68 : 94) : 0
      const textX = x + entryInset, textWidth = width - entryInset
      const size = block.kind === 'title' ? 25 : block.kind === 'heading' ? baseSize + 1 : block.kind === 'note' ? 9 : baseSize
      const style = { bold: block.kind === 'title' || block.kind === 'heading' || block.kind === 'subtitle', italic: block.kind === 'note', serif: document.font === 'Georgia' }
      const color = block.kind === 'heading' ? accent : ink, spacing = size * (document.layout === 'compact' ? 1.3 : 1.5)
      if (block.kind === 'heading') {
        y -= 9; if (y < bottom + spacing * 3) { index++; y = top }
        if (document.cv && document.layout === 'band') {
          getPage(index).drawRectangle({ x, y: y - 5, width, height: size + 12, color: rgb(.92, .97, .95) })
          getPage(index).drawRectangle({ x, y: y - 5, width: 2, height: size + 12, color: rgb(...accent) })
        }
        if (document.font === 'Georgia' && document.blocks[0]?.kind === 'title') getPage(index).drawLine({ start: { x, y: y + size + 3 }, end: { x: x + width, y: y + size + 3 }, thickness: document.layout === 'centered' ? .5 : 1, color: rgb(...accent) })
      }
      let dateEnd: { index: number; y: number } | undefined
      if (entryInset && block.period) {
        // Render dates through the same wrapping and pagination code as body text.
        dateEnd = await render([{kind: 'note', text: block.period}], x, entryInset - 10, y, index)
      }
      for (const paragraph of block.text.split('\n')) {
        const lines: PreparedText[] = []
        let text = ''
        for (const word of paragraph.split(/\s+/u)) {
          const candidate = text ? text + ' ' + word : word
          const measured = await prepare(candidate, style, size, color)
          if (measured.width <= textWidth) { text = candidate; continue }
          if (text) { lines.push(await prepare(text, style, size, color)); text = '' }
          // Keep a portfolio domain intact instead of leaving one orphan letter.
          const slash = /^https?:\/\//.test(word) ? word.indexOf('/', word.indexOf('://') + 3) : -1
          const domain = slash > 0 ? word.slice(0, slash + 1) : ''
          const remainder = domain && (await prepare(domain, style, size, color)).width <= textWidth ? word.slice(slash + 1) : word
          if (remainder !== word) lines.push(await prepare(domain, style, size, color))
          for (const character of Array.from(remainder)) {
            const next = text + character
            if ((await prepare(next, style, size, color)).width > textWidth && text) { lines.push(await prepare(text, style, size, color)); text = character }
            else text = next
          }
        }
        lines.push(await prepare(text || ' ', style, size, color))
        for (const line of lines) {
          if (y < bottom + spacing) { index++; y = top }
          const centered = block.align === 'center' || document.layout === 'centered' && (block.kind === 'title' || block.kind === 'heading' || block.kind === 'subtitle' && block.period === undefined)
          draw(getPage(index), line, centered ? textX + Math.max(0, (textWidth - line.width) / 2) : textX + (document.cv && document.layout === 'band' && block.kind === 'heading' ? 8 : 0), y, size, color); y -= spacing
        }
      }
      y -= block.kind === 'heading' ? 4 : 8
      if (dateEnd && dateEnd.index > index) { index = dateEnd.index; y = dateEnd.y }
      else if (dateEnd?.index === index) y = Math.min(y, dateEnd.y)
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
    const header = await render(document.blocks.slice(0, 2), margin + (document.layout === 'band' ? 12 : 0), document.layout === 'band' ? 385 : 397, start - (document.layout === 'band' ? 8 : 0))
    start = Math.min(header.y, 670)
    if (document.sidebar?.length) { await render(document.sidebar, margin, 144, start, 0, 9.5); await render(document.blocks.slice(2), margin + 164, 343.276, start) }
    else await render(document.blocks.slice(2), margin, 507.276, start)
  } else if (document.sidebar?.length) {
    const header = await render(document.blocks.slice(0, 2), margin, 507.276, start)
    await render(document.sidebar, margin, 144, Math.min(header.y, 697), 0, 9.5); await render(document.blocks.slice(2), margin + 164, 343.276, Math.min(header.y, 697))
  } else if (document.layout === 'band') {
    const header = await render(document.blocks.slice(0, 2), margin + 12, 483.276, start - 8)
    await render(document.blocks.slice(2), margin, 507.276, Math.min(header.y, 708), header.index)
  } else await render(document.blocks, margin, 507.276, start)
  const font = await createFontLoader(pdf)('regular')
  for (const [index, page] of pages.entries()) page.drawText(`${index + 1} / ${pages.length}`, { x: margin, y: 24, size: 9, font, color: rgb(.4, .4, .4) })
  return new Blob([new Uint8Array(await pdf.save())], { type: 'application/pdf' })
}
