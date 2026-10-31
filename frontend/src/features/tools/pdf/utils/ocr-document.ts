import type { PageText, TextRun } from '../types/text-layer.types'
import type { OcrEditableDocument, OcrDocumentPage, OcrDocumentText, OcrTextStyle, OcrDocumentTable } from '../types/ocr-document.types'

export const DEFAULT_OCR_STYLE: OcrTextStyle = { font: 'sans', fontSize: 11, bold: false, italic: false, align: 'left', lineHeight: 1.2 }
const median = (values: number[], fallback: number) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? fallback
const bounds = (points: { x: number; y: number }[]) => {
  const x = Math.min(...points.map(p => p.x)), y = Math.min(...points.map(p => p.y))
  return { x, y, width: Math.max(...points.map(p => p.x)) - x, height: Math.max(...points.map(p => p.y)) - y }
}
const center = (run: TextRun) => ({ x: run.origin.x + run.width / 2, y: run.origin.y - run.size * .3 })
const contains = (box: ReturnType<typeof bounds>, run: TextRun) => { const p = center(run); return p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height }
const sizeOf = (runs: TextRun[]) => Math.max(6, Math.min(36, median(runs.map(r => r.size), 11)))
const textOf = (runs: TextRun[]) => runs.map((run, i) => `${run.text}${i === runs.length - 1 ? '' : run.eol ? '\n' : ' '}`).join('').trim()

/** Build editable content from the chosen OCR reading; alternative readings never duplicate text. */
export function ocrDocumentPage(page: PageText, size: { width: number; height: number }, id: string): OcrDocumentPage {
  const used = new Set<TextRun>(), tables: OcrDocumentTable[] = []
  for (const table of page.ocr?.layout?.tables ?? []) {
    if (!table.cells.length || table.origin !== 'ruled') continue
    const box = bounds(table.cells.flatMap(cell => cell.bbox)), xs = new Map<number, number>(), ys = new Map<number, number>()
    const cells = table.cells.map(cell => {
      const b = bounds(cell.bbox), runs = page.runs.filter(run => !used.has(run) && contains(b, run))
      runs.forEach(run => used.add(run))
      xs.set(cell.column, b.x); xs.set(cell.column + cell.columnSpan, b.x + b.width)
      ys.set(cell.row, b.y); ys.set(cell.row + cell.rowSpan, b.y + b.height)
      const letters = cell.rawText.match(/\p{L}/gu) ?? []
      const heading = cell.row < Math.max(1, ...table.cells.filter(c => c.row === 0).map(c => c.rowSpan)) && letters.length >= 3
        && letters.filter(letter => letter.toLocaleUpperCase() === letter).length / letters.length >= .85
      const centered = heading || /^\s*[\d.,/%+−-]+\s*$/u.test(cell.rawText) || b.width < box.width * .14 && cell.rawText.trim().length <= 15
      return { ...DEFAULT_OCR_STYLE, id: cell.id, row: cell.row, column: cell.column, rowSpan: cell.rowSpan, columnSpan: cell.columnSpan, text: cell.rawText, fontSize: sizeOf(runs), bold: heading, align: centered ? 'center' as const : 'left' as const }
    })
    const intervals = (count: number, values: Map<number, number>, start: number, length: number) => Array.from({ length: count }, (_, i) => Math.max(1, (values.get(i + 1) ?? start + length * (i + 1) / count) - (values.get(i) ?? start + length * i / count)))
    tables.push({ id: `${id}:${table.id}`, kind: 'table', ...box, columns: intervals(table.columns, xs, box.x, box.width), rows: intervals(table.rows, ys, box.y, box.height), cells })
  }
  const rows: TextRun[][] = []; let row: TextRun[] = []
  for (const run of page.runs) {
    if (!used.has(run) && run.text.trim()) row.push(run)
    if (run.eol) { if (row.length) rows.push(row); row = [] }
  }
  if (row.length) rows.push(row)
  if (tables.length) {
    // Separate columns can share one OCR line (e.g. the two signature headings).
    const separated: TextRun[][] = []
    for (const runs of rows) {
      let group: TextRun[] = []
      for (const run of [...runs].sort((a, b) => a.origin.x - b.origin.x)) {
        const previous = group.at(-1)
        if (previous && run.origin.x - previous.origin.x - previous.width > Math.max(previous.size, run.size) * 2.5) { separated.push(group); group = [] }
        group.push(run)
      }
      if (group.length) separated.push(group)
    }
    rows.splice(0, rows.length, ...separated)
  }
  const typical = sizeOf(page.runs), blocks: OcrDocumentText[] = []
  for (const [index, runs] of rows.entries()) {
    if (tables.length && runs.map(run => run.text).join('').replace(/[^\p{L}\p{N}]/gu, '').length < 2) continue
    const fontSize = sizeOf(runs), x = Math.max(0, Math.min(...runs.map(r => r.origin.x)))
    const baseline = median(runs.map(r => r.origin.y + (r.origin.x - x) * Math.tan(r.angle * Math.PI / 180)), runs[0].origin.y)
    const y = Math.max(0, baseline - fontSize * .8), width = Math.max(12, Math.min(size.width - x, Math.max(...runs.map(r => r.origin.x + r.width)) - x + fontSize * .5))
    const text = textOf(runs), previous = blocks.at(-1), heading = fontSize > typical * 1.2
    const paragraphStart = /^[^\p{L}\p{N}]{0,5}(?:[-•]|\d+[.)]|[A-ZĐ]\.)\s/u.test(text)
      || /^(?:Câu|Điều|Mục|Chương|Question|Article|Section|Chapter)\s+\d+/iu.test(text)
    const join = !tables.length && previous && !heading && !previous.bold && !paragraphStart
      && Math.abs(previous.x - x) < typical * 2 && Math.abs(previous.fontSize - fontSize) < typical * .15
      && y >= previous.y && y - previous.y - previous.height < typical * .8
    if (join) {
      const right = Math.max(previous.x + previous.width, x + width), left = Math.min(previous.x, x)
      previous.indent = (previous.indent ?? 0) + previous.x - left
      previous.x = left; previous.width = right - left; previous.height = y + fontSize * 1.2 - previous.y
      previous.text += ` ${text}`
      previous.referenceLines?.push({ text, width })
    } else blocks.push({ ...DEFAULT_OCR_STYLE, id: `${id}:text-${index}`, kind: 'text', x, y, width, height: fontSize * 1.2, text, fontSize, bold: heading, font: runs[0].fontFamily === 'serif' ? 'serif' : 'sans', referenceLines: [{ text, width }] })
  }
  return { id, ...size, blocks: [...blocks, ...tables].sort((a, b) => a.y - b.y || a.x - b.x) }
}

export function documentPlainText(document: OcrEditableDocument): string[] {
  return document.pages.map(page => page.blocks.map(block => block.kind === 'text' ? block.text : block.cells.map(cell => cell.text).join('\n')).join('\n'))
}
