import type { PageText } from '../types/text-layer.types'
import { ocrCsv, ocrTableValues } from '../utils/ocr-csv'
import { plainText } from '../utils/plain-text'
import { reviewedPageText } from '../utils/ocr-review'
import { validateOcrFields, validateOcrTable } from '../utils/ocr-validation'
import { exportOcrOffice } from './ocr-export-office'

export type OcrStructuredOutput = 'docx' | 'xlsx' | 'csv' | 'json'
export function reviewedOcrText(page: PageText): string {
  const layout = page.ocr?.layout
  if (layout?.tables.length) {
    const ids = new Set(layout.tables.flatMap(table => table.cells.flatMap(cell => [...cell.wordIds, `manual-${cell.id}`])))
    const outside = page.ocr?.words.filter(word => !ids.has(word.id)).map(word => ({ ...word.run, text: word.verifiedValue ?? word.normalizedText })).filter(run => run.text) ?? []
    return [plainText({ runs: outside }), ...layout.tables.map(table => ocrTableValues(table).map(row => row.join('\t')).join('\n'))].filter(Boolean).join('\n\n')
  }
  return plainText(page)
}

export async function exportReviewedOcr(pages: PageText[], format: OcrStructuredOutput, signal: AbortSignal): Promise<Blob> {
  signal.throwIfAborted()
  for (const page of pages) if (page.ocr) reviewedPageText(page.ocr)
  if (format === 'docx' || format === 'xlsx') return exportOcrOffice(pages, format, signal)
  if (format === 'csv') {
    const tables = pages.flatMap(page => page.ocr?.layout?.tables ?? [])
    if (!tables.length) throw new Error('OCR_TABLE_REQUIRED')
    if (tables.length === 1) return new Blob([ocrCsv(tables[0])], { type: 'text/csv;charset=utf-8' })
    const { zipSync, strToU8 } = await import('fflate')
    const files = Object.fromEntries(tables.map((table, index) => [`table-${index + 1}.csv`, strToU8(ocrCsv(table))]))
    return new Blob([new Uint8Array(zipSync(files))], { type: 'application/zip' })
  }
  const result = { schemaVersion: 2, privacy: 'local-session; no automatic upload or training', pages: pages.map(page => ({ text: reviewedOcrText(page), ...page.ocr,
    validations: [...validateOcrFields(page.ocr?.layout?.fields ?? []), ...(page.ocr?.layout?.tables ?? []).flatMap(validateOcrTable)] })) }
  return new Blob([JSON.stringify(result, null, 2) + '\n'], { type: 'application/json;charset=utf-8' })
}
