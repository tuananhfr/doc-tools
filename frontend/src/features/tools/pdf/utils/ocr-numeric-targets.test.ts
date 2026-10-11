import { describe, expect, it } from 'vitest'
import { numericTargets } from './ocr-numeric-targets'
import { ocrWords } from './ocr-review'

describe('bounded numeric rereading', () => {
  it('rereads digit lookalikes and leading-zero identifiers without guessing text labels', () => {
    const words = ocrWords([{ bbox: { x0: 0, y0: 0, x1: 500, y1: 30 }, baseline: { x0: 0, y0: 28, x1: 500, y1: 28 },
      words: ['0012', 'l25O000', '29/02/2024', 'BÁO', 'III', 'Mã01'].map((text, index) => ({ text, confidence: 90 - index, bbox: { x0: index * 60, y0: 0, x1: index * 60 + 50, y1: 30 } })) }], 1, point => point, { width: 500, height: 40 })
    expect(numericTargets(words).map(word => word.rawText)).toEqual(['29/02/2024', 'l25O000', '0012'])
    expect(numericTargets(words, 1)[0].rawText).toBe('29/02/2024')
    expect(words[0].rawText).toBe('0012')
  })
})
