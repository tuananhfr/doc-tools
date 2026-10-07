import type { OcrTable } from '../types/ocr-layout.types'

export function ocrTableValues(table: OcrTable): string[][] {
  if (!table.verifiedAt) throw new Error('OCR_LAYOUT_REVIEW_REQUIRED')
  const rows = Array.from({ length: table.rows }, () => new Array<string>(table.columns).fill(''))
  for (const cell of table.cells) rows[cell.row][cell.column] = cell.verified?.value ?? cell.rawText
  return rows
}

export function safeCsvValue(input: string): string {
  // Spreadsheet apps may interpret quoted cells as formulas after importing CSV.
  const value = /^[\s\u0000-\u001f]*[=+@-]/u.test(input) || /^\d{16,}$/u.test(input) || /^0\d/u.test(input) ? `'${input}` : input
  return `"${value.replace(/"/gu, '""')}"`
}

export function ocrCsv(table: OcrTable): string {
  return '\ufeff' + ocrTableValues(table).map(row => row.map(safeCsvValue).join(',')).join('\r\n') + '\r\n'
}
