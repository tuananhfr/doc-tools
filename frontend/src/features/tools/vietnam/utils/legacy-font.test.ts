import { expect, it } from 'vitest'
import { isUnicodeVietnamese, removeVietnameseMarks, tcvn3ToUnicode, vniToUnicode } from './legacy-font'

it('converts old Vietnamese encodings without changing unaffected characters', () => {
  expect(tcvn3ToUnicode('®¸')).toBe('đá')
  expect(vniToUnicode('Tieáng Vieät')).toBe('Tiếng Việt')
  expect(removeVietnameseMarks('Đắk Lắk')).toBe('Dak Lak')
})

it('recognizes text that is already Unicode Vietnamese, but not legacy-encoded text', () => {
  expect(isUnicodeVietnamese('Công ty Hà Nội đã có dấu')).toBe(true)
  expect(isUnicodeVietnamese('Tiếng Việt'.normalize('NFD'))).toBe(true)
  expect(isUnicodeVietnamese('Céng hoµ x· héi chñ nghÜa ViÖt Nam §éc lËp')).toBe(false)
  expect(isUnicodeVietnamese('Coäng hoøa xaõ hoäi chuû nghóa Vieät Nam Ñoäc laäp')).toBe(false)
  expect(isUnicodeVietnamese('plain ASCII text')).toBe(false)
})
