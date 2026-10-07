import type { OcrPageResult, OcrWordResult } from '../types/ocr-result.types'
import type { OcrCell, OcrField, OcrTable } from '../types/ocr-layout.types'
import { confirmOcrWord } from './ocr-review'

export function cellReviewValue(cell: OcrCell, words: OcrWordResult[]): string {
  if (cell.verified) return cell.verified.value
  if (cell.proposal) return cell.proposal.value
  if (!cell.wordIds.length) return words.find(word => word.id === `manual-${cell.id}`)?.verifiedValue ?? cell.rawText
  return cell.wordIds.map(id => words.find(word => word.id === id)).filter(word => word !== undefined).map(word => word.verifiedValue ?? word.normalizedText).filter(Boolean).join(' ')
}

function applyValue(result: OcrPageResult, wordIds: string[], value: string, id: string, cell?: OcrCell): OcrPageResult {
  let first = true
  const words = result.words.map(word => {
    if (!wordIds.includes(word.id) && word.id !== id) return word
    const next = confirmOcrWord(word, first ? value : '')
    first = false
    return next
  })
  if (first && value && cell) {
    const bbox = cell.bbox, width = Math.hypot(bbox[1].x - bbox[0].x, bbox[1].y - bbox[0].y), size = Math.min(12, Math.max(6, Math.abs(bbox[3].y - bbox[0].y) * 0.7))
    const previous = words.find(word => word.id === id)
    const word: OcrWordResult = { id, rawText: '', normalizedText: '', confidence: 0, confidenceLevel: 'LOW', bbox, previewBox: { x: 0, y: 0, width: 1, height: 1 }, contentType: /\d/u.test(value) ? 'numeric' : 'text',
      run: { text: value, origin: { x: bbox[0].x, y: bbox[0].y + size }, angle: 0, size, width, ascent: 0.8, descent: 0.2, fontName: 'ocr', fontFamily: 'sans-serif', eol: true }, verifiedValue: value, verifiedAt: new Date().toISOString(), verifiedBy: 'local-user' }
    if (previous) words.splice(words.indexOf(previous), 1, word)
    else words.push(word)
  }
  return { ...result, words }
}

export function confirmOcrTable(result: OcrPageResult, table: OcrTable): OcrPageResult {
  const at = new Date().toISOString()
  const confirmed = { ...table, verifiedAt: at, cells: table.cells.map(cell => ({ ...cell, verified: { value: cellReviewValue(cell, result.words).normalize('NFC'), at, by: 'local-user' as const } })) }
  const activeManualIds = new Set(confirmed.cells.map(cell => `manual-${cell.id}`))
  let next = { ...result, words: result.words.filter(word => !word.id.startsWith(`manual-${table.id}:`) || activeManualIds.has(word.id)) }
  for (const cell of confirmed.cells) next = applyValue(next, cell.wordIds, cell.verified.value, `manual-${cell.id}`, cell)
  return { ...next, layout: { ...next.layout!, tables: (next.layout?.tables ?? []).map(current => current.id === table.id ? confirmed : current) } }
}

export function confirmOcrField(result: OcrPageResult, field: OcrField, value: string): OcrPageResult {
  const confirmed = { ...field, wordIds: field.wordIds.length ? field.wordIds : [`manual-field:${field.id}`], draftValue: undefined, verified: { value: value.trim().normalize('NFC'), at: new Date().toISOString(), by: 'local-user' as const } }
  const next = applyValue(result, field.wordIds, confirmed.verified.value, `manual-field:${field.id}`, { bbox: result.words[0]?.bbox ?? [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 30 }, { x: 0, y: 30 }] } as OcrCell)
  return { ...next, layout: { ...next.layout!, fields: next.layout!.fields.map(current => current.id === field.id ? confirmed : current) } }
}
