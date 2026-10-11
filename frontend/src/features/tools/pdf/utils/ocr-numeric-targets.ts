import type { OcrWordResult } from '../types/ocr-result.types'

export function numericTargets(words: OcrWordResult[], limit = 12): OcrWordResult[] {
  return words.filter(word => /\d/u.test(word.rawText) && /^[\dOoIl.,/\-+\s]+$/u.test(word.rawText))
    .sort((left, right) => left.confidence - right.confidence).slice(0, limit)
}
