import { describe, expect, it } from 'vitest'
import { mergeOcrPasses } from './ocr-consensus'
import { needsOcrReview, ocrWords } from './ocr-review'
import type { OcrLine } from './ocr-runs'

function words(values: { text: string; x: number; width: number }[]) {
  const line: OcrLine = { bbox: { x0: 0, y0: 0, x1: 200, y1: 30 }, baseline: { x0: 0, y0: 25, x1: 200, y1: 25 },
    words: values.map(value => ({ text: value.text, confidence: 95, bbox: { x0: value.x, y0: 0, x1: value.x + value.width, y1: 30 } })) }
  return ocrWords([line], 1, point => point, { width: 200, height: 100 })
}
describe('OCR pass consensus', () => {
  it('limits numeric crop comparisons to their selected target words', () => {
    const original = words([{ text: 'Tiền', x: 0, width: 30 }, { text: '100', x: 40, width: 50 }])
    const result = mergeOcrPasses([{ pass: 'original', words: original, engineVersion: 'test' }, { pass: 'numeric', words: words([{ text: '100', x: 40, width: 50 }]), targetWordIds: [original[1].id], engineVersion: 'test' }])
    expect(result[0].reviewReasons).toBeUndefined()
    expect(result[1].candidates).toHaveLength(2)
  })
  it('requires review for a wrong high-score Vietnamese diacritic', () => {
    const original = words([{ text: 'BIẾN', x: 0, width: 60 }]), alternative = words([{ text: 'BIÊN', x: 0, width: 60 }])
    const [result] = mergeOcrPasses([{ pass: 'original', words: original, engineVersion: 'test' }, { pass: 'contrast', words: alternative, engineVersion: 'test' }])
    expect(result.rawText).toBe('BIẾN')
    expect(result.confidence).toBe(95)
    expect(result.reviewReasons).toContain('disagreement')
    expect(needsOcrReview(result)).toBe(true)
    expect(result.candidates?.map(candidate => candidate.rawText)).toEqual(['BIẾN', 'BIÊN'])
  })
  it('aligns split tokens without silently deleting either candidate', () => {
    const original = words([{ text: '1250000', x: 0, width: 120 }]), alternative = words([{ text: '125', x: 0, width: 45 }, { text: '0000', x: 48, width: 70 }])
    const result = mergeOcrPasses([{ pass: 'original', words: original, engineVersion: 'test' }, { pass: 'deskew', words: alternative, engineVersion: 'test' }])
    expect(result).toHaveLength(1)
    expect(result[0].candidates?.at(-1)?.rawText).toBe('125 0000')
    expect(result[0].confidence).toBe(95)
  })
  it('keeps newly detected content as unverified and preserves original reading order', () => {
    const original = words([{ text: 'Một', x: 0, width: 30 }, { text: 'hai', x: 40, width: 30 }]), alternative = words([{ text: 'Một', x: 0, width: 30 }, { text: 'hai', x: 40, width: 30 }, { text: 'ba', x: 140, width: 30 }])
    const result = mergeOcrPasses([{ pass: 'original', words: original, engineVersion: 'test' }, { pass: 'contrast', words: alternative, engineVersion: 'test' }])
    expect(result.map(word => word.rawText)).toEqual(['Một', 'hai', 'ba'])
    expect(result[2].reviewReasons).toEqual(['unmatched'])
  })
})
