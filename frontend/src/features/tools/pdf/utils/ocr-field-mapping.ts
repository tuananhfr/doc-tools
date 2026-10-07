import type { OcrField } from '../types/ocr-layout.types'
import type { OcrWordResult } from '../types/ocr-result.types'
import { OCR_FORM_TEMPLATES } from '../config/ocr-form-templates'

const normalizedAnchor = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gu, 'd').toLowerCase().replace(/[^a-z0-9 ]/gu, '').replace(/\s+/gu, ' ').trim()

export function receiptFields(words: OcrWordResult[]): OcrField[] {
  const groups = new Map<string, OcrWordResult[]>()
  for (const word of words) { const line = word.id.split(':')[0]; groups.set(line, [...(groups.get(line) ?? []), word]) }
  return OCR_FORM_TEMPLATES[0].fields.map(field => {
    for (const line of groups.values()) {
      const prefix: string[] = []
      for (let index = 0; index < Math.min(line.length, 4); index++) {
        prefix.push(line[index].rawText)
        if (!field.anchors.some(anchor => normalizedAnchor(prefix.join(' ')) === anchor)) continue
        const value = line.slice(index + 1).filter(word => normalizedAnchor(word.rawText) !== '')
        return { id: field.id, label: field.label, kind: field.kind, required: field.required, wordIds: value.map(word => word.id), rawText: value.map(word => word.rawText).join(' ').replace(/^\s*:\s*/u, ''), verified: null }
      }
    }
    return { id: field.id, label: field.label, kind: field.kind, required: field.required, wordIds: [], rawText: '', verified: null }
  })
}
