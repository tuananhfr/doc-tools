import { describe, expect, it } from 'vitest'
import { confirmOcrWord, needsOcrReview, ocrWords, reviewedPageText } from './ocr-review'
import type { OcrPageResult } from '../types/ocr-result.types'
import type { OcrLine } from './ocr-runs'
import { visualToBase } from './page-geometry'

const line: OcrLine = {
  bbox: { x0: 10, y0: 20, x1: 250, y1: 60 }, baseline: { x0: 10, y0: 50, x1: 250, y1: 50 },
  words: [
    { text: 'Tên', confidence: 97, bbox: { x0: 10, y0: 20, x1: 50, y1: 60 } },
    { text: '1.250.000', confidence: 99, bbox: { x0: 60, y0: 20, x1: 150, y1: 60 } },
    { text: '~~', confidence: 12, bbox: { x0: 160, y0: 20, x1: 180, y1: 60 } },
    { text: 'Đức', confidence: 65, bbox: { x0: 190, y0: 20, x1: 250, y1: 60 } },
  ],
}
const words = () => ocrWords([line], 2, point => point, { width: 400, height: 600 })
const page = (): OcrPageResult => ({ sourceId: 'test', pageIndex: 0, sourceHash: null, engine: 'tesseract', engineVersion: 'test', pass: 'original', words: words(), qualityFlags: [] })

describe('OCR review', () => {
  it('retains low-confidence words, original boxes and unchanged money', () => {
    const all = words()
    expect(all).toHaveLength(4)
    expect(all[1]).toMatchObject({ rawText: '1.250.000', normalizedText: '1.250.000', confidence: 99, contentType: 'numeric', verifiedValue: null })
    expect(all[2].confidence).toBe(12)
    expect(all[0].bbox).toEqual([{ x: 5, y: 10 }, { x: 25, y: 10 }, { x: 25, y: 30 }, { x: 5, y: 30 }])
    expect(all[0].previewBox).toEqual({ x: 0.025, y: 20 / 600, width: 0.1, height: 40 / 600 })
  })
  it('requires confirmation for all numeric values, even at high confidence', () => {
    expect(words().map(needsOcrReview)).toEqual([false, true, true, true])
    expect(() => reviewedPageText(page())).toThrow('OCR_REVIEW_REQUIRED')
  })
  it('preserves raw text and records local confirmation while exporting edited values', () => {
    const original = page()
    const reviewed = { ...original, words: original.words.map(word => confirmOcrWord(word, word.id === '0:2' ? '' : word.id === '0:1' ? '1.280.000' : word.normalizedText, '2026-10-07T00:00:00Z')) }
    const result = reviewedPageText(reviewed)
    expect(result.runs.map(run => run.text)).toEqual(['Tên', '1.280.000', 'Đức'])
    expect(result.ocr?.words[1]).toMatchObject({ rawText: '1.250.000', verifiedValue: '1.280.000', verifiedBy: 'local-user', verifiedAt: '2026-10-07T00:00:00Z' })
    expect(original.words[1].verifiedValue).toBeNull()
  })
  it('retains line breaks when noise at the end of a line is discarded', () => {
    const all = ocrWords([line, line], 2, point => point, { width: 400, height: 600 })
    const result = reviewedPageText({ ...page(), words: all.map(word => confirmOcrWord(word, word.id.endsWith(':3') ? '' : word.normalizedText)) })
    expect(result.runs.filter(run => run.eol)).toHaveLength(2)
  })
  it('maps the original boxes on rotated pages', () => {
    const [word] = ocrWords([line], 1, point => visualToBase(point, { width: 400, height: 600 }, 90), { width: 600, height: 400 })
    expect(word.bbox[0]).toEqual(visualToBase({ x: 10, y: 20 }, { width: 400, height: 600 }, 90))
    expect(Math.round(word.run.angle)).toBe(90)
  })
  it('normalizes edited Vietnamese but never guesses ambiguous names or amounts', () => {
    expect(confirmOcrWord(words()[0], 'Đức'.normalize('NFD')).verifiedValue).toBe('Đức')
    expect(words()[1].normalizedText).toBe(line.words[1].text)
  })
})
