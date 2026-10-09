import { describe, expect, it } from 'vitest'
import { numberToVietnameseWords } from './number-words'

describe('numberToVietnameseWords', () => {
  it('reads grouped numbers and leading zero groups', () => {
    expect(numberToVietnameseWords('1.234.567')).toBe('Một triệu hai trăm ba mươi bốn nghìn năm trăm sáu mươi bảy')
    expect(numberToVietnameseWords('1.000.005')).toBe('Một triệu không trăm linh năm')
    expect(numberToVietnameseWords('-24')).toBe('Âm hai mươi bốn')
  })

  it('says "tỷ" once per billion block, after its last non-zero group', () => {
    expect(numberToVietnameseWords('1.500.000.000')).toBe('Một tỷ năm trăm triệu')
    expect(numberToVietnameseWords('1.234.567.890')).toBe('Một tỷ hai trăm ba mươi bốn triệu năm trăm sáu mươi bảy nghìn tám trăm chín mươi')
    expect(numberToVietnameseWords('2.000.000.000.000')).toBe('Hai nghìn tỷ')
    expect(numberToVietnameseWords('1.500.000.000.000')).toBe('Một nghìn năm trăm tỷ')  })

  it('rejects invalid input rather than silently changing its value', () => {
    expect(numberToVietnameseWords('12a3')).toBeNull()
    expect(numberToVietnameseWords('1.5x')).toBeNull()
    expect(numberToVietnameseWords('1,5')).toBeNull()
  })
})
