import { describe, expect, it } from 'vitest'
import type { TextRun } from '../types/text-layer.types'
import { buildPageIndex, findInPage, foldText, matchCarets, matchQuads, matchSnippet, type SearchOptions } from './text-search'

const loose: SearchOptions = { ignoreAccents: true, matchCase: false }
const strict: SearchOptions = { ignoreAccents: false, matchCase: true }

function run(text: string, x: number, y: number, extra: Partial<TextRun> = {}): TextRun {
  return { text, origin: { x, y }, angle: 0, size: 10, width: text.length * 5, ascent: 0.8, descent: 0.2, fontName: 'f1', fontFamily: 'sans-serif', eol: false, ...extra }
}

describe('buildPageIndex', () => {
  it('joins touching runs into one word and spaced runs with a space', () => {
    // "hợ" + "p" sát nhau (gap 0), "đồng" cách 5pt (> 0,15 × 10).
    const index = buildPageIndex({ runs: [run('hợ', 0, 100), run('p', 10, 100), run('đồng', 20, 100)] })
    expect(index.text).toBe('hợp đồng')
    expect(Array.from(index.run)).toEqual([0, 0, 1, -1, 2, 2, 2, 2])
  })

  it('breaks lines at end-of-line runs and at a new baseline', () => {
    const index = buildPageIndex({ runs: [run('Điều', 0, 100, { eol: true }), run('1', 0, 115), run('khoản', 0, 130)] })
    expect(index.text).toBe('Điều 1 khoản')
  })
})

describe('findInPage', () => {
  const index = buildPageIndex({ runs: [run('Hợp đồng thi công', 0, 100), run('HỢP ĐỒNG', 0, 120)] })

  it('matches without accents or case', () => {
    expect(findInPage(index, 'hop dong', loose)).toHaveLength(2)
  })

  it('respects accents and case when asked', () => {
    expect(findInPage(index, 'Hợp đồng', strict)).toEqual([{ start: 0, end: 8 }])
    expect(findInPage(index, 'hop dong', strict)).toEqual([])
  })

  it('folds characters one-to-one so offsets stay on the original text', () => {
    const text = 'Đường Hầm ỷ'
    expect(foldText(text, loose)).toHaveLength(text.length)
    expect(foldText(text, loose)).toBe('duong ham y')
  })

  it('matches decomposed input against composed page text', () => {
    expect(findInPage(index, 'Hợp'.normalize('NFD'), strict)).toHaveLength(1)
  })
})

describe('matchQuads', () => {
  it('returns one quad per run crossed by the match', () => {
    const index = buildPageIndex({ runs: [run('abc', 0, 100), run('def', 30, 100)] })
    const [match] = findInPage(index, 'bc de', loose)
    const quads = matchQuads(index, match)
    expect(quads).toHaveLength(2)
    expect(quads[0][0]).toEqual({ x: 5, y: 92 })
    expect(quads[1][2]).toEqual({ x: 40, y: 102 })
  })

  it('follows the text direction on rotated text', () => {
    const index = buildPageIndex({ runs: [run('ab', 50, 200, { angle: 90 })] })
    const [quad] = matchQuads(index, { start: 1, end: 2 })
    // Chữ chạy lên: ký tự thứ 2 nằm từ y = 195 tới 190, phía trên là bên trái đường chân.
    expect(quad[0].x).toBeCloseTo(42)
    expect(quad[0].y).toBeCloseTo(195)
    expect(quad[1].y).toBeCloseTo(190)
  })
})

describe('matchSnippet', () => {
  it('trims the context with ellipses', () => {
    const index = buildPageIndex({ runs: [run('Bên A đồng ý thanh toán cho Bên B trong vòng 30 ngày', 0, 100)] })
    const [match] = findInPage(index, 'thanh toán', loose)
    expect(matchSnippet(index, match, 6)).toEqual({ before: '…ồng ý ', match: 'thanh toán', after: ' cho B…' })
  })
})

describe('matchCarets', () => {
  it('points at the first and last matched characters across runs', () => {
    const index = buildPageIndex({
      runs: [
        { text: 'Hợp đồng', origin: { x: 0, y: 10 }, angle: 0, size: 10, width: 40, ascent: 0.8, descent: 0.2, fontName: 'f', fontFamily: 'sans-serif', eol: false },
        { text: 'thi công', origin: { x: 45, y: 10 }, angle: 0, size: 10, width: 40, ascent: 0.8, descent: 0.2, fontName: 'f', fontFamily: 'sans-serif', eol: false },
      ],
    })
    const [match] = findInPage(index, 'dong thi', { ignoreAccents: true, matchCase: false })
    expect(matchCarets(index, match)).toEqual([
      { run: 0, offset: 4 },
      { run: 1, offset: 3 },
    ])
  })
})
