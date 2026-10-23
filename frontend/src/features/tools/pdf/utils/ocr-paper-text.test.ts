import { expect, it } from 'vitest'
import type { TextRun } from '../types/text-layer.types'
import { ocrPaperText } from './ocr-paper-text'

const run = (text: string, x: number, y: number, eol = true): TextRun => ({ text, origin: { x, y }, angle: 0, size: 10, width: 30, ascent: .8, descent: .2, fontName: 'ocr', fontFamily: 'sans-serif', eol })
it('preserves wide answer spacing and paragraph gaps without changing recognized characters', () => {
  const text = ocrPaperText({ runs: [run('Câu 1', 0, 10), run('Nội dung', 0, 25), run('A. Một', 0, 40, false), run('B. Hai', 100, 40), run('Câu 2', 0, 80)] })
  expect(text).toBe('Câu 1\nNội dung\nA. Một    B. Hai\n\nCâu 2')
})
it('keeps OCR line breaks on curved photos instead of grouping by uncertain baselines', () => {
  expect(ocrPaperText({ runs: [run('Thành', 0, 100, false), { ...run('phần', 31, 103), angle: 4 }, run('Câu 6', 0, 120)] })).toBe('Thành phần\nCâu 6')
})
