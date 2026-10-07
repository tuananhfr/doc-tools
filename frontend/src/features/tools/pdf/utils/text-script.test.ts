import { describe, expect, it } from 'vitest'
import { cjkOrder, isCjk, isRtl, needsRaster, splitByCoverage } from './text-script'

describe('needsRaster', () => {
  it('bắt hệ chữ cần shaping, bỏ qua Latin / Việt / CJK', () => {
    expect(needsRaster('صفحة 1/12')).toBe(true)
    expect(needsRaster('หน้า 1')).toBe(true)
    expect(needsRaster('ទំព័រ 1')).toBe(true)
    expect(needsRaster('ໜ້າ 1')).toBe(true)
    expect(needsRaster('စာမျက်နှာ 1')).toBe(true)
    expect(needsRaster('Bản sao · 第1页 · 1페이지')).toBe(false)
  })

  it('chỉ Hebrew / Ả Rập là phải-sang-trái', () => {
    expect(isRtl('نسخة')).toBe(true)
    expect(isRtl('หน้า')).toBe(false)
  })
})

describe('cjkOrder', () => {
  it('kana ưu tiên JP, Hangul ưu tiên KR dù trang ngôn ngữ nào', () => {
    expect(cjkOrder('コピー', 'vi')[0]).toBe('Jp')
    expect(cjkOrder('사본', 'zh-hans')[0]).toBe('Kr')
  })

  it('chữ Hán thuần theo ngôn ngữ trang, mặc định giản thể', () => {
    expect(cjkOrder('副本', 'zh-hant')).toEqual(['Tc', 'Sc', 'Jp', 'Kr'])
    expect(cjkOrder('副本', 'ja')[0]).toBe('Jp')
    expect(cjkOrder('副本', 'en')[0]).toBe('Sc')
  })
})

describe('splitByCoverage', () => {
  it('gộp ký tự liền nhau cùng phông', () => {
    const latin = (char: string) => !isCjk(char)
    expect(splitByCoverage('Trang 1 / 第1页', latin)).toEqual([
      { text: 'Trang 1 / ', base: true },
      { text: '第', base: false },
      { text: '1', base: true },
      { text: '页', base: false },
    ])
  })

  it('không tách đôi ký tự ngoài BMP', () => {
    expect(splitByCoverage('a𠀋b', (char) => char !== '𠀋').map((slice) => slice.text)).toEqual(['a', '𠀋', 'b'])
  })
})
