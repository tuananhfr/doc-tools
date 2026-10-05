import { expect, it } from 'vitest'
import { removeVietnameseMarks, tcvn3ToUnicode, vniToUnicode } from './legacy-font'

it('converts old Vietnamese encodings without changing unaffected characters', () => {
  expect(tcvn3ToUnicode('®¸')).toBe('đá')
  expect(vniToUnicode('Tieáng Vieät')).toBe('Tiếng Việt')
  expect(removeVietnameseMarks('Đắk Lắk')).toBe('Dak Lak')
})
