import type { OcrEditableDocument, OcrTextStyle } from '../types/ocr-document.types'

export interface OcrDocumentLine { text: string; x: number; y: number; start: number; end: number }
export interface OcrDocumentFragment extends OcrTextStyle {
  sourcePage: number; blockId: string; cellId?: string; x: number; y: number; width: number; height: number
  start: number; end: number; lines: OcrDocumentLine[]
}
export interface OcrDocumentPaper { width: number; height: number; fragments: OcrDocumentFragment[]; borders: { x: number; y: number; width: number; height: number }[] }
export type OcrDocumentMeasure = (text: string, style: OcrTextStyle) => number

/** Character ranges let an edited fragment replace only its own source text. */
function wrap(text: string, width: number, style: OcrTextStyle, measure: OcrDocumentMeasure, indent = 0) {
  const lines: { text: string; start: number; end: number }[] = []
  let start = 0, position = 0, line = ''
  const draw = (end: number) => { lines.push({ text: line.trimEnd(), start, end }); line = ''; start = end }
  for (const token of text.matchAll(/\n|[^\S\n]+|[^\s]+/gu)) {
    const word = token[0], index = token.index
    if (word === '\n') { draw(index); start = index + 1; position = start; continue }
    if (/^\s+$/u.test(word)) { if (line) line += ' '; position = index + word.length; continue }
    const available = Math.max(12, width - (!lines.length ? indent : 0))
    if (line.trim() && measure(line + word, style) > available) { draw(index); start = index }
    for (const character of word) {
      const currentWidth = Math.max(12, width - (!lines.length ? indent : 0))
      if (line && measure(line + character, style) > currentWidth) { draw(position); start = position }
      line += character; position += character.length
    }
    position = index + word.length
  }
  draw(text.length)
  return lines
}

/** One measured layout drives the PDF and editable paper, including overflow pages. */
export function layoutOcrDocument(document: OcrEditableDocument, measure: OcrDocumentMeasure): OcrDocumentPaper[] {
  const papers: OcrDocumentPaper[] = []
  document.pages.forEach((source, sourcePage) => {
    const margin = source.margin ?? 12, capacity = source.height - margin * 2, first = papers.length
    const paperAt = (globalY: number) => {
      const offset = Math.max(0, Math.floor((globalY - margin + 1e-7) / capacity))
      while (papers.length <= first + offset) papers.push({ width: source.width, height: source.height, fragments: [], borders: [] })
      return { paper: papers[first + offset], offset, y: Math.max(margin, globalY - offset * capacity) }
    }
    paperAt(margin)
    const previous: { x: number; width: number; originalY: number; originalBottom: number; bottom: number }[] = []
    const heightAt = (y: number, count: number, lineHeight: number) => {
      let at = y
      for (let i = 0; i < count; i++) {
        const local = ((at - margin) % capacity + capacity) % capacity
        if (local + lineHeight > capacity) at += capacity - local
        at += lineHeight
      }
      return at - y
    }
    const addText = (text: string, style: OcrTextStyle, x: number, y: number, width: number, blockId: string, cellId?: string, indent = 0) => {
      indent = Math.max(0, Math.min(indent, width - 12))
      const rows = wrap(text, width, style, measure, indent), lineHeight = style.fontSize * style.lineHeight
      let last: OcrDocumentFragment | undefined, shift = 0
      rows.forEach((line, index) => {
        let globalY = y + index * lineHeight + shift
        const inPage = ((globalY - margin) % capacity + capacity) % capacity
        if (inPage + lineHeight > capacity) { shift += capacity - inPage; globalY += capacity - inPage }
        const target = paperAt(globalY)
        if (!last || !target.paper.fragments.includes(last)) {
          last = { ...style, sourcePage, blockId, cellId, x, y: target.y, width, height: 0, start: line.start, end: line.end, lines: [] }
          target.paper.fragments.push(last)
        }
        const lineX = x + (!index ? indent : 0)
        last.lines.push({ ...line, x: lineX, y: target.y }); last.end = line.end; last.height = target.y + lineHeight - last.y
      })
      return Math.max(lineHeight, rows.length * lineHeight + shift)
    }
    for (const block of [...source.blocks].sort((a, b) => a.y - b.y || a.x - b.x)) {
      let y = Math.max(margin, block.y)
      for (const before of previous) {
        const overlap = Math.min(block.x + block.width, before.x + before.width) - Math.max(block.x, before.x)
        if (overlap > Math.min(block.width, before.width) * .2 && block.y > before.originalY + 1) y = Math.max(y, before.bottom + Math.max(0, block.y - before.originalBottom))
      }
      let height: number
      if (block.kind === 'text') height = Math.max(block.height, addText(block.text, block, block.x, y, block.width, block.id, undefined, block.indent))
      else {
        const padding = block.columns.length >= 8 ? 3 : 5
        const rows = [...block.rows], columnX = (column: number) => block.x + block.columns.slice(0, column).reduce((a, b) => a + b, 0)
        for (let pass = 0; pass < 2; pass++) for (const cell of [...block.cells].sort((a, b) => a.row - b.row)) {
          const width = block.columns.slice(cell.column, cell.column + cell.columnSpan).reduce((a, b) => a + b, 0)
          const top = y + rows.slice(0, cell.row).reduce((a, b) => a + b, 0)
          const required = heightAt(top + padding, wrap(cell.text, Math.max(12, width - padding * 2), cell, measure).length, cell.fontSize * cell.lineHeight) + padding * 2
          const current = rows.slice(cell.row, cell.row + cell.rowSpan).reduce((a, b) => a + b, 0)
          if (required > current) rows[cell.row + cell.rowSpan - 1] += required - current
        }
        for (const cell of block.cells) {
          const top = y + rows.slice(0, cell.row).reduce((a, b) => a + b, 0), x = columnX(cell.column)
          const width = block.columns.slice(cell.column, cell.column + cell.columnSpan).reduce((a, b) => a + b, 0), height = rows.slice(cell.row, cell.row + cell.rowSpan).reduce((a, b) => a + b, 0)
          addText(cell.text, cell, x + padding, top + padding, Math.max(12, width - padding * 2), block.id, cell.id)
          let at = top, remaining = height
          while (remaining > .01) {
            const target = paperAt(at), part = Math.min(remaining, source.height - margin - target.y)
            target.paper.borders.push({ x, y: target.y, width, height: part })
            const fragment = target.paper.fragments.find(fragment => fragment.blockId === block.id && fragment.cellId === cell.id)
            if (fragment) fragment.height = Math.max(fragment.height, target.y + part - padding - fragment.y)
            remaining -= part; at += part
            if (part <= .01) break
          }
        }
        height = rows.reduce((a, b) => a + b, 0)
      }
      previous.push({ x: block.x, width: block.width, originalY: block.y, originalBottom: block.y + block.height, bottom: y + height })
    }
  })
  return papers
}
