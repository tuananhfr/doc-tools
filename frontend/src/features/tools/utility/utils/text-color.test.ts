import { describe, expect, it } from 'vitest'
import { BLACK, contrastLevel, contrastRatio, formatHex, formatHsl, formatRgb, hslToRgb, parseHex, parseHsl, parseRgb, rgbToHsl, WHITE } from './color'
import { textStats } from './text-stats'

describe('textStats', () => {
  it('chuỗi rỗng là toàn số không', () => {
    expect(textStats('')).toEqual({ characters: 0, charactersNoSpaces: 0, words: 0, lines: 0, paragraphs: 0 })
  })

  it('đếm chữ Việt có dấu, kể cả gõ kiểu tổ hợp', () => {
    const composed = 'Nghiệm thu'
    const decomposed = composed.normalize('NFD')
    expect(decomposed.length).toBeGreaterThan(composed.length)
    expect(textStats(composed)).toMatchObject({ characters: 10, charactersNoSpaces: 9, words: 2 })
    expect(textStats(decomposed)).toMatchObject({ characters: 10, charactersNoSpaces: 9, words: 2 })
  })

  it('đếm dòng và đoạn', () => {
    const text = 'Đoạn một, dòng một\ndòng hai\n\n\nĐoạn hai\n'
    expect(textStats(text)).toMatchObject({ lines: 6, paragraphs: 2, words: 8 })
    expect(textStats('một dòng')).toMatchObject({ lines: 1, paragraphs: 1 })
    expect(textStats('  \n  ')).toMatchObject({ lines: 2, paragraphs: 0, words: 0, charactersNoSpaces: 0 })
  })

  it('xuống dòng kiểu Windows là một ký tự', () => {
    expect(textStats('a\r\nb')).toMatchObject({ characters: 3, lines: 2 })
  })

  it('dấu câu đứng riêng không phải từ, emoji là một ký tự', () => {
    expect(textStats('- Hạng mục 1: 12,5 m²')).toMatchObject({ words: 5 })
    expect(textStats('👍🏽 ok')).toMatchObject({ characters: 4, words: 1 })
  })
})

describe('màu', () => {
  it('đọc mã HEX ba và sáu chữ số', () => {
    expect(parseHex('#DA3548')).toEqual({ r: 218, g: 53, b: 72 })
    expect(parseHex('da3548')).toEqual({ r: 218, g: 53, b: 72 })
    expect(parseHex(' #fa0 ')).toEqual({ r: 255, g: 170, b: 0 })
    expect(parseHex('#da354')).toBeNull()
    expect(parseHex('#gggggg')).toBeNull()
  })

  it('đọc RGB và HSL ở vài cách viết', () => {
    expect(parseRgb('218, 53, 72')).toEqual({ r: 218, g: 53, b: 72 })
    expect(parseRgb('rgb(218 53 72)')).toEqual({ r: 218, g: 53, b: 72 })
    expect(parseRgb('256, 0, 0')).toBeNull()
    expect(parseRgb('218, 53')).toBeNull()
    expect(parseHsl('hsl(353, 69%, 53%)')).toEqual({ h: 353, s: 69, l: 53 })
    expect(parseHsl('360 100% 50%')).toEqual({ h: 0, s: 100, l: 50 })
    expect(parseHsl('353, 101%, 53%')).toBeNull()
  })

  it('in ra dạng CSS', () => {
    expect(formatHex({ r: 218, g: 53, b: 72 })).toBe('#DA3548')
    expect(formatRgb({ r: 218, g: 53, b: 72 })).toBe('rgb(218, 53, 72)')
    expect(formatHsl({ h: 353, s: 69, l: 53 })).toBe('hsl(353, 69%, 53%)')
  })

  it('đổi RGB ↔ HSL', () => {
    expect(rgbToHsl({ r: 218, g: 53, b: 72 })).toEqual({ h: 353, s: 69, l: 53 })
    expect(rgbToHsl({ r: 255, g: 255, b: 255 })).toEqual({ h: 0, s: 0, l: 100 })
    expect(rgbToHsl({ r: 128, g: 128, b: 128 })).toEqual({ h: 0, s: 0, l: 50 })
    expect(hslToRgb({ h: 0, s: 100, l: 50 })).toEqual({ r: 255, g: 0, b: 0 })
    expect(hslToRgb({ h: 120, s: 100, l: 25 })).toEqual({ r: 0, g: 128, b: 0 })
    expect(hslToRgb({ h: 240, s: 100, l: 50 })).toEqual({ r: 0, g: 0, b: 255 })
    expect(hslToRgb({ h: 200, s: 0, l: 20 })).toEqual({ r: 51, g: 51, b: 51 })
  })

  it('màu thuần đi một vòng RGB → HSL → RGB không đổi', () => {
    for (const rgb of [
      { r: 255, g: 0, b: 0 },
      { r: 0, g: 255, b: 255 },
      { r: 255, g: 0, b: 255 },
      { r: 0, g: 0, b: 0 },
    ]) {
      expect(hslToRgb(rgbToHsl(rgb))).toEqual(rgb)
    }
  })

  it('tính tương phản WCAG', () => {
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5)
    expect(contrastRatio(WHITE, WHITE)).toBe(1)
    // #767676 là màu xám nhạt nhất còn đạt AA trên nền trắng.
    expect(contrastRatio({ r: 118, g: 118, b: 118 }, WHITE)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio({ r: 119, g: 119, b: 119 }, WHITE)).toBeLessThan(4.5)
    expect([contrastLevel(21), contrastLevel(4.5), contrastLevel(3), contrastLevel(2.9)]).toEqual(['aaa', 'aa', 'large', 'fail'])
  })
})
