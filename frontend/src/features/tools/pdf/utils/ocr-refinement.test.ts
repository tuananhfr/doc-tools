import { expect, it } from 'vitest'
import { refineOcrExportWords, refineOcrLineMarks } from './ocr-refinement'
import { ocrWords } from './ocr-review'
import type { OcrLine } from './ocr-runs'
import type { OcrPassWords } from './ocr-consensus'

const line = (text: string, confidence: number, x = 10): OcrLine => ({
  bbox: { x0: x, y0: 10, x1: x + 50, y1: 30 }, baseline: { x0: x, y0: 27, x1: x + 50, y1: 27 },
  words: [{ text, confidence, bbox: { x0: x, y0: 10, x1: x + 50, y1: 30 } }],
})
const pass = (name: OcrPassWords['pass'], text: string, confidence: number, x = 10): OcrPassWords => ({
  pass: name, engineVersion: 'test', words: ocrWords([line(text, confidence, x)], 1, p => p, { width: 200, height: 100 }),
})

it('exports a strongly improved mark reading while retaining line endings and layout', () => {
  const original = pass('original', 'BIỆN', 70), alternative = pass('contrast', 'BIÊN', 95)
  const [result] = refineOcrExportWords(original, [original, alternative])
  expect(result.run).toEqual({ ...original.words[0].run, text: 'BIÊN' })
  expect(result.rawText).toBe('BIÊN')
  expect(original.words[0].rawText).toBe('BIỆN')
})

it('does not use unmatched text, changed letters, identifiers, or an uncertain mark as a correction', () => {
  for (const [before, after, score, x] of [
    ['Bình', 'Bính', 89, 10], ['Bình', 'Minh', 99, 10], ['LPC01', 'LPC02', 99, 10], ['Bình', 'Bính', 99, 120],
  ] as const) {
    const original = pass('original', before, 70)
    expect(refineOcrExportWords(original, [pass('contrast', after, score, x)])[0].rawText).toBe(before)
  }
  const original = pass('original', 'Bình', 94)
  expect(refineOcrExportWords(original, [pass('contrast', 'Bính', 98)])[0].rawText).toBe('Bình')
})

it('keeps numeric crops from changing text outside their targets', () => {
  const original = pass('original', 'HỖ', 60), numeric = { ...pass('numeric', 'HỒ', 99), targetWordIds: ['unrelated'] }
  expect(refineOcrExportWords(original, [numeric])[0].rawText).toBe('HỖ')
})

it('does not take a large overlapping line candidate as several separate words', () => {
  const original = pass('original', 'HỖ', 60)
  original.words.push({ ...original.words[0], id: '0:1' })
  expect(refineOcrExportWords(original, [pass('contrast', 'HỒ', 99)]).map(w => w.rawText)).toEqual(['HỖ', 'HỖ'])
})

it('refines cell marks without borrowing partial lines, changing digits, or changing geometry', () => {
  const original = [line('HỖ', 65), line('SƠ', 95, 70)]
  const refined = refineOcrLineMarks(original, [[line('HỒ', 96), line('SƠ', 95, 70)]])
  expect(refined.map(l => l.words[0].text)).toEqual(['HỒ', 'SƠ'])
  expect(refined[0].bbox).toEqual(original[0].bbox)
  expect(original[0].words[0].text).toBe('HỖ')
  expect(refineOcrLineMarks(original, [[line('HỒ', 99)]])).toEqual(original)
  expect(refineOcrLineMarks([line('01', 60)], [[line('02', 99)]])[0].words[0].text).toBe('01')
})

it('keeps a corrected mark on an intact line when another line changes its numbers', () => {
  const original = [line('Kể', 65), line('228', 90)]
  const refined = refineOcrLineMarks(original, [[line('Kế', 96), line('22ồ', 95)]])
  expect(refined.map(l => l.words[0].text)).toEqual(['Kế', '228'])
})
