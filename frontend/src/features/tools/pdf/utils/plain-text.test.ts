import { describe, expect, it } from 'vitest'
import type { TextRun } from '../types/text-layer.types'
import { joinPageTexts, plainText } from './plain-text'

function run(text: string, x: number, y: number, extra: Partial<TextRun> = {}): TextRun {
  return { text, origin: { x, y }, angle: 0, size: 10, width: text.length * 5, ascent: 0.8, descent: 0.2, fontName: 'f1', fontFamily: 'sans-serif', eol: false, ...extra }
}

describe('plainText', () => {
  it('keeps one word whole and separates spaced runs', () => {
    // "hợ" + "p" sát nhau, "đồng" cách 5pt (> 0,15 × 10).
    expect(plainText({ runs: [run('hợ', 0, 100), run('p', 10, 100), run('đồng', 20, 100)] })).toBe('hợp đồng')
  })

  it('breaks the line at an end-of-line run and at a new baseline', () => {
    const runs = [run('Điều', 0, 100), run('1', 25, 100, { eol: true }), run('Phạm', 0, 115), run('vi', 25, 115), run('Điều 2', 0, 130)]
    expect(plainText({ runs })).toBe('Điều 1\nPhạm vi\nĐiều 2')
  })

  it('does not double a space the run already carries', () => {
    expect(plainText({ runs: [run('Hợp ', 0, 100), run('đồng', 30, 100)] })).toBe('Hợp đồng')
  })

  it('returns an empty string for a page without text', () => {
    expect(plainText({ runs: [] })).toBe('')
  })
})

describe('joinPageTexts', () => {
  it('separates pages with a blank line and drops empty pages', () => {
    expect(joinPageTexts(['Trang một', '', 'Trang ba'])).toBe('Trang một\n\nTrang ba')
  })
})
