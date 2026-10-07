export type CjkFamily = 'Sc' | 'Tc' | 'Jp' | 'Kr'

/**
 * Hệ chữ cần dàn chữ phức tạp (ghép nét, dấu chồng, viết phải-sang-trái): Hebrew, Ả Rập,
 * Ấn, Thái, Lào, Tây Tạng, Myanmar, Khmer. pdf-lib chỉ đặt glyph nối tiếp, không shaping —
 * vẽ bằng phông thật ra chữ rời rạc / sai thứ tự, nên cả dòng phải vẽ qua canvas.
 */
const COMPLEX = /[֐-ࣿऀ-෿฀-࿿က-႟ក-៿᧠-᧿ꧠ-꧿ꩠ-ꩿיִ-﷿ﹰ-﻿]/
const RTL = /[֐-ࣿיִ-﷿ﹰ-﻿]/
const CJK = /[⺀-⿿　-ㇿ㈀-鿿가-힯豈-﫿＀-￯]|[\u{20000}-\u{3FFFF}]/u
const KANA = /[぀-ヿㇰ-ㇿ]/
const HANGUL = /[ᄀ-ᇿ㄰-㆏가-힯]/

export const needsRaster = (text: string) => COMPLEX.test(text)
export const isRtl = (text: string) => RTL.test(text)
export const isCjk = (char: string) => CJK.test(char)

const LANGUAGE_FAMILY: Record<string, CjkFamily> = { 'zh-hans': 'Sc', 'zh-hant': 'Tc', ja: 'Jp', ko: 'Kr' }
const FAMILIES: CjkFamily[] = ['Sc', 'Tc', 'Jp', 'Kr']

/**
 * Thứ tự thử phông CJK. Kana / Hangul chỉ có ở JP / KR. Chữ Hán thuần thì cùng mã nhưng
 * nét viết khác theo nước (骨, 直…) — theo ngôn ngữ trang, trang không phải CJK thì giản thể.
 */
export function cjkOrder(text: string, language: string): CjkFamily[] {
  const first = KANA.test(text) ? 'Jp' : HANGUL.test(text) ? 'Kr' : (LANGUAGE_FAMILY[language] ?? 'Sc')
  return [first, ...FAMILIES.filter((family) => family !== first)]
}

export interface CoverageSlice {
  text: string
  base: boolean
}

/** Cắt dòng thành các khúc liền nhau theo việc phông chính có vẽ được ký tự hay không. */
export function splitByCoverage(text: string, covered: (char: string) => boolean): CoverageSlice[] {
  const slices: CoverageSlice[] = []
  for (const char of text) {
    const base = covered(char)
    const last = slices.at(-1)
    if (last && last.base === base) last.text += char
    else slices.push({ text: char, base })
  }
  return slices
}
