import type { ImageSheet } from '../types/doc-tools.types'
import { A4_SIZE } from './page-geometry'

export interface OcrPaperPage { sourceIndex: number; lines: string[] }
export interface OcrPaperLayout { width: number; height: number; margin: number; fontSize: number; lineHeight: number; pages: OcrPaperPage[] }

/** The editor and exported PDF use the same font measurements, wrapping and page breaks. */
export function layoutOcrText(texts: string[], sheet: ImageSheet, measure: (text: string, size: number) => number): OcrPaperLayout {
  const size = sheet.paper === 'a3' ? { width: 841.89, height: 1190.55 } : sheet.paper === 'letter' ? { width: 612, height: 792 } : A4_SIZE
  const margin = Math.max(36, sheet.margin * 72 / 25.4), fontSize = 12, lineHeight = 19, width = size.width - margin * 2
  const maxLines = Math.floor((size.height - margin * 2 - fontSize) / lineHeight) + 1, pages: OcrPaperPage[] = []
  texts.forEach((text, sourceIndex) => {
    let page: OcrPaperPage = { sourceIndex, lines: [] }; pages.push(page)
    const draw = (line: string) => {
      if (page.lines.length >= maxLines) { page = { sourceIndex, lines: [] }; pages.push(page) }
      page.lines.push(line)
    }
    const paragraphs = text.normalize('NFC').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').split(/\r?\n/)
    for (const paragraph of paragraphs) {
      let line = '', gap = ' '
      for (const word of paragraph.trim().match(/\S+|\s+/gu) ?? []) {
        if (/^\s+$/u.test(word)) { gap = word.replace(/\t/g, '    '); continue }
        const candidate = line ? `${line}${gap}${word}` : word
        if (measure(candidate, fontSize) <= width) { line = candidate; continue }
        if (line) { draw(line); line = '' }
        for (const character of Array.from(word)) {
          if (line && measure(line + character, fontSize) > width) { draw(line); line = '' }
          line += character
        }
      }
      draw(line)
    }
  })
  return { ...size, margin, fontSize, lineHeight, pages }
}

export function editedOcrSources(layout: OcrPaperLayout, values: string[], sourceCount: number): string[] {
  const sources: string[][] = Array.from({ length: sourceCount }, () => [])
  layout.pages.forEach((page, index) => sources[page.sourceIndex].push(values[index] ?? page.lines.join('\n')))
  return sources.map(pages => pages.join('\n').replace(/\r\n?/g, '\n').normalize('NFC'))
}
