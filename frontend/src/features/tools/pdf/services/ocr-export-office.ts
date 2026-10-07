import type { PageText } from '../types/text-layer.types'
import { ocrTableValues } from '../utils/ocr-csv'
import { plainText } from '../utils/plain-text'

export async function exportOcrOffice(pages: PageText[], format: 'docx' | 'xlsx', signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted()
  if (format === 'xlsx') {
    const { default: ExcelJS } = await import('exceljs')
    const workbook = new ExcelJS.Workbook()
    for (const [pageIndex, page] of pages.entries()) for (const [tableIndex, table] of (page.ocr?.layout?.tables ?? []).entries()) {
      const sheet = workbook.addWorksheet(`P${pageIndex + 1}-T${tableIndex + 1}`)
      for (const row of ocrTableValues(table)) sheet.addRow(row)
      for (const cell of table.cells) if (cell.rowSpan > 1 || cell.columnSpan > 1) sheet.mergeCells(cell.row + 1, cell.column + 1, cell.row + cell.rowSpan, cell.column + cell.columnSpan)
      sheet.eachRow(row => row.eachCell(cell => { cell.numFmt = '@' }))
      sheet.columns.forEach(column => { column.width = 24 })
      signal.throwIfAborted()
    }
    if (!workbook.worksheets.length) throw new Error('OCR_TABLE_REQUIRED')
    const bytes = await workbook.xlsx.writeBuffer()
    signal.throwIfAborted()
    return new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  }
  const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, VerticalMergeType } = await import('docx')
  const sections = pages.map(page => {
    const tables = page.ocr?.layout?.tables ?? []
    const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = []
    const tableWordIds = new Set(tables.flatMap(table => table.cells.flatMap(cell => [...cell.wordIds, `manual-${cell.id}`])))
    const text = tables.length ? plainText({ runs: page.ocr?.words.filter(word => !tableWordIds.has(word.id)).map(word => ({ ...word.run, text: word.verifiedValue ?? word.normalizedText })).filter(run => run.text) ?? [] }) : plainText(page)
    if (text) children.push(...text.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] })))
    for (const table of tables) {
      const rows = Array.from({ length: table.rows }, (_, row) => new TableRow({ children: table.cells.filter(cell => cell.row === row || cell.row < row && cell.row + cell.rowSpan > row).sort((a, b) => a.column - b.column).map(cell => new TableCell({
        columnSpan: cell.columnSpan, verticalMerge: cell.rowSpan > 1 ? cell.row === row ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE : undefined,
        children: [new Paragraph(cell.row === row ? cell.verified?.value ?? cell.rawText : '')],
      })) }))
      children.push(new Table({ rows }))
    }
    return { children: children.length ? children : [new Paragraph('')] }
  })
  const blob = await Packer.toBlob(new Document({ sections }))
  signal.throwIfAborted()
  return blob
}
