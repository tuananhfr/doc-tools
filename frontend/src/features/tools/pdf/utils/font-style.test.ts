import { describe, expect, it } from 'vitest'
import { faceStyle, FONT_KEYS, fontFamilyKey, fontKey, guessFontStyle } from './font-style'

describe('guessFontStyle', () => {
  it('đọc đậm/nghiêng/có chân từ tên phông nhúng, bỏ tiền tố subset', () => {
    expect(guessFontStyle('ABCDEF+TimesNewRomanPS-BoldItalicMT')).toEqual({ serif: true, bold: true, italic: true })
    expect(guessFontStyle('ArialMT')).toEqual({ serif: false, bold: false, italic: false })
    expect(guessFontStyle('QWERTY+Arial-BoldMT')).toEqual({ serif: false, bold: true, italic: false })
    expect(guessFontStyle('Calibri-Italic')).toEqual({ serif: false, bold: false, italic: true })
  })

  it('tên có "Sans" thì không có chân dù có chữ serif', () => {
    expect(guessFontStyle('NotoSans-SemiBold').serif).toBe(false)
    expect(guessFontStyle('SourceSerifPro-Regular').serif).toBe(true)
  })

  it('không có tên thì dựa vào họ phông chung của pdf.js', () => {
    expect(guessFontStyle('', 'serif').serif).toBe(true)
    expect(guessFontStyle('g_d0_f1', 'sans-serif').serif).toBe(false)
  })
})

describe('fontKey', () => {
  it('mỗi tổ hợp ra một khoá khác nhau, đúng tên khoá', () => {
    const keys = new Set<string>()
    for (const match of [false, true])
      for (const serif of [false, true]) for (const bold of [false, true]) for (const italic of [false, true]) keys.add(fontKey({ serif, bold, italic, match }))
    expect([...keys].sort()).toEqual([...FONT_KEYS].sort())
    expect(fontKey({ serif: false, bold: true, italic: true })).toBe('boldItalic')
    expect(fontKey({ serif: true, bold: false, italic: false })).toBe('serif')
    expect(fontKey({ serif: false, bold: false, italic: false, match: true })).toBe('matchRegular')
    expect(fontKey({ serif: true, bold: true, italic: true, match: true })).toBe('matchSerifBoldItalic')
  })

  it('phông trên máy không đổi khoá phông đóng sẵn dùng làm dự phòng', () => {
    expect(fontKey({ serif: false, bold: true, italic: false, match: true, local: 'Arial-BoldMT' })).toBe('matchBold')
  })
})

describe('fontFamilyKey', () => {
  it('tên phông trong PDF và họ phông trên máy quy về cùng một khoá', () => {
    expect(fontFamilyKey('ABCDEF+TimesNewRomanPS-BoldItalicMT')).toBe(fontFamilyKey('Times New Roman'))
    expect(fontFamilyKey('TimesNewRoman,Bold')).toBe('timesnewroman')
    expect(fontFamilyKey('ArialMT')).toBe(fontFamilyKey('Arial'))
    expect(fontFamilyKey('BCDEEE+Calibri-Light')).toBe('calibri')
  })

  it('họ phông khác nhau không lẫn vào nhau', () => {
    expect(fontFamilyKey('ArialNarrow-Bold')).not.toBe(fontFamilyKey('Arial'))
    expect(fontFamilyKey('g_d0_f1')).not.toBe(fontFamilyKey('Arial'))
  })
})

describe('faceStyle', () => {
  it('đọc đậm/nghiêng từ tên kiểu của mặt phông trên máy', () => {
    expect(faceStyle('Regular')).toEqual({ bold: false, italic: false })
    expect(faceStyle('Bold Italic')).toEqual({ bold: true, italic: true })
    expect(faceStyle('Oblique')).toEqual({ bold: false, italic: true })
  })
})
