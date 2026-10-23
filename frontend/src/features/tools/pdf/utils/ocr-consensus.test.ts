import { describe, expect, it } from 'vitest'
import { mergeOcrPasses, selectOcrExportPass } from './ocr-consensus'
import { needsOcrReview, ocrWords } from './ocr-review'
import type { OcrLine } from './ocr-runs'

function words(values: { text: string; x: number; width: number }[]) {
  const line: OcrLine = { bbox: { x0: 0, y0: 0, x1: 200, y1: 30 }, baseline: { x0: 0, y0: 25, x1: 200, y1: 25 },
    words: values.map(value => ({ text: value.text, confidence: 95, bbox: { x0: value.x, y0: 0, x1: value.x + value.width, y1: 30 } })) }
  return ocrWords([line], 1, point => point, { width: 200, height: 100 })
}
describe('OCR pass consensus', () => {
  it('recovers full lines after perspective scanning even when a truncated original has a high score', () => {
    const pass = (name: 'original' | 'local', text: string, confidence: number) => ({ pass: name, engineVersion: 'test', words: words([{ text, x: 0, width: 180 }]).map(word => ({ ...word, confidence })) })
    const original = pass('original', 'Câu 18. Đại hội Quốc tế Cộng\nkẻ thù trước mắt nguy hiểm của', 91.3)
    const local = pass('local', 'Câu 18. Đại hội Quốc tế Cộng sản lần thứ VII (7/1935) xác định\nkẻ thù trước mắt nguy hiểm của nhân dân thế giới là gì?', 93.2)
    expect(selectOcrExportPass([original, local])).toBe(local)
    expect(selectOcrExportPass([original, { ...local, words: local.words.map(word => ({ ...word, confidence: 90 })) }])).toBe(original)
    const unrelated = pass('local', 'Nhiều chữ hoàn toàn khác được thêm vào trang và không khớp nội dung cũ của hình chụp', 93.2)
    expect(selectOcrExportPass([original, unrelated])).toBe(original)
    const repeated = pass('local', 'Câu '.repeat(40), 93.2)
    expect(selectOcrExportPass([original, repeated])).toBe(original)
  })
  it('accepts a substantially stronger local reading when the original missed entire paragraphs', () => {
    const original = { pass: 'original' as const, words: words([{ text: 'Đoạn bị thiếu', x: 0, width: 60 }]).map(word => ({ ...word, confidence: 87 })), engineVersion: 'test' }
    const recovered = { pass: 'local' as const, words: words([{ text: 'Đoạn bị thiếu và các câu hỏi được đọc lại đầy đủ', x: 0, width: 180 }]).map(word => ({ ...word, confidence: 94 })), engineVersion: 'test' }
    expect(selectOcrExportPass([original, recovered])).toBe(recovered)
    expect(selectOcrExportPass([original, { ...recovered, words: recovered.words.map(word => ({ ...word, confidence: 88 })) }])).toBe(original)
    expect(selectOcrExportPass([original, { ...recovered, pass: 'contrast' }])).toBe(original)
  })
  it('recovers missing text when a local reading is longer at an equal or higher score', () => {
    const original = { pass: 'original' as const, words: words([{ text: 'Một trang chữ', x: 0, width: 60 }]).map(word => ({ ...word, confidence: 92 })), engineVersion: 'test' }
    const local = { pass: 'local' as const, words: words([{ text: 'Một trang chữ rõ', x: 0, width: 80 }]).map(word => ({ ...word, confidence: 93 })), engineVersion: 'test' }
    expect(selectOcrExportPass([original, local])).toBe(local)
    expect(selectOcrExportPass([original, { ...local, words: local.words.map(word => ({ ...word, confidence: 89 })) }])).toBe(original)
  })
  it('accepts a measurably stronger local reading without merging fragments into it', () => {
    const original = { pass: 'original' as const, words: words([{ text: 'Một trang chữ', x: 0, width: 60 }]).map(word => ({ ...word, confidence: 90 })), engineVersion: 'test' }
    const local = { pass: 'local' as const, words: words([{ text: 'Một trang chữ', x: 0, width: 60 }]).map(word => ({ ...word, confidence: 93 })), engineVersion: 'test' }
    expect(selectOcrExportPass([original, local])).toBe(local)
    expect(selectOcrExportPass([original, { ...local, words: local.words.map(word => ({ ...word, confidence: 89 })) }])).toBe(original)
  })
  it('exports a complete reading rather than concatenating unmatched noise from another pass', () => {
    const original = { pass: 'original' as const, words: words([{ text: 'Thành phần', x: 0, width: 60 }]), engineVersion: 'test' }
    const noisy = { pass: 'contrast' as const, words: words([{ text: 'HN', x: 120, width: 20 }]).map(word => ({ ...word, confidence: 0 })), engineVersion: 'test' }
    expect(mergeOcrPasses([original, noisy])).toHaveLength(2)
    expect(selectOcrExportPass([original, noisy])).toBe(original)
  })
  it('prefers a stronger full-page pass but not a short high-confidence fragment', () => {
    const original = { pass: 'original' as const, words: words([{ text: 'Thành phần', x: 0, width: 60 }]).map(word => ({ ...word, confidence: 60 })), engineVersion: 'test' }
    const better = { pass: 'contrast' as const, words: words([{ text: 'Thành phần', x: 0, width: 60 }]), engineVersion: 'test' }
    expect(selectOcrExportPass([original, better])).toBe(better)
    expect(selectOcrExportPass([original, { ...better, words: words([{ text: 'A', x: 0, width: 10 }]) }])).toBe(original)
  })
  it('proposes a stronger aligned reading without changing raw text or its score', () => {
    const original = words([{ text: 'BIẾN', x: 0, width: 60 }]).map(word => ({ ...word, confidence: 64, confidenceLevel: 'MEDIUM' as const }))
    const [result] = mergeOcrPasses([{ pass: 'original', words: original, engineVersion: 'test' }, { pass: 'contrast', words: words([{ text: 'BIÊN', x: 0, width: 60 }]), engineVersion: 'test' }])
    expect(result).toMatchObject({ rawText: 'BIẾN', normalizedText: 'BIÊN', confidence: 64, proposedCandidateId: 'contrast:0:0' })
    expect(needsOcrReview(result)).toBe(true)
  })
  it('inserts recovered words between their neighboring original words', () => {
    const original = words([{ text: 'Một', x: 0, width: 30 }, { text: 'ba', x: 140, width: 30 }])
    const alternative = words([{ text: 'Một', x: 0, width: 30 }, { text: 'hai', x: 60, width: 30 }, { text: 'ba', x: 140, width: 30 }])
    const result = mergeOcrPasses([{ pass: 'original', words: original, engineVersion: 'test' }, { pass: 'contrast', words: alternative, engineVersion: 'test' }])
    expect(result.map(word => word.rawText)).toEqual(['Một', 'hai', 'ba'])
    expect(needsOcrReview(result[1])).toBe(true)
    expect(result[1].id.split(':')[0]).toBe('0')
  })
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
