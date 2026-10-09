import { describe, expect, it } from 'vitest'
import { checkNumber, formatQuantity, parseDecimal, readNumber } from './number-input'

describe('checkNumber', () => {
  const MONEY = { kind: 'money', min: 0, max: 1e12 } as const

  it('ô tiền hiểu "30.000.000" là ba mươi triệu, không phải 30', () => {
    expect(checkNumber('30.000.000', MONEY)).toEqual({ state: 'ok', value: 30_000_000 })
    expect(readNumber('500.000.000', MONEY)).toBe(500_000_000)
  })

  it('ô số đo hiểu "0,9" là không phẩy chín, không phải 9', () => {
    expect(readNumber('0,9', { kind: 'decimal', min: 0 })).toBe(0.9)
  })

  it('phân biệt ô trống, không đọc được, sai số nguyên và ngoài khoảng', () => {
    expect(checkNumber('  ', MONEY)).toEqual({ state: 'empty' })
    expect(checkNumber('ba triệu', MONEY)).toEqual({ state: 'invalid', value: null })
    expect(checkNumber('1,5', { kind: 'integer', min: 0 })).toEqual({ state: 'integer', value: 1.5 })
    expect(checkNumber('150', { kind: 'decimal', min: 0, max: 100 })).toEqual({ state: 'range', value: 150 })
    expect(readNumber('150', { kind: 'decimal', min: 0, max: 100 })).toBeNull()
  })
})

describe('parseDecimal', () => {
  it('nhận dấu thập phân là phẩy hoặc chấm', () => {
    expect(parseDecimal('2,5')).toBe(2.5)
    expect(parseDecimal('2.5')).toBe(2.5)
    expect(parseDecimal(' 12 ')).toBe(12)
    expect(parseDecimal('-0,25')).toBe(-0.25)
    expect(parseDecimal(',5')).toBe(0.5)
    expect(parseDecimal('3,')).toBe(3)
  })

  it('một dấu đứng một mình là dấu thập phân, kể cả khi theo sau là ba chữ số', () => {
    expect(parseDecimal('1.500')).toBe(1.5)
    expect(parseDecimal('1,500')).toBe(1.5)
  })

  it('bỏ dấu nhóm nghìn khi có cả hai loại dấu hoặc một dấu lặp lại', () => {
    expect(parseDecimal('1.234,5')).toBe(1234.5)
    expect(parseDecimal('1,234.5')).toBe(1234.5)
    expect(parseDecimal('1.234.567')).toBe(1234567)
    expect(parseDecimal('1 234 567')).toBe(1234567)
  })

  it('trả null khi chưa phải một con số', () => {
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal(',')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('1,2,3.4.5')).toBeNull()
    expect(parseDecimal('1e5')).toBeNull()
    expect(parseDecimal('12m')).toBeNull()
  })
})

describe('formatQuantity', () => {
  it('in theo kiểu Việt và gọt đuôi nhiễu của số thực', () => {
    expect(formatQuantity(1234.5)).toBe('1.234,5')
    expect(formatQuantity(0.1 + 0.2)).toBe('0,3')
    expect(formatQuantity(0.000001)).toBe('0,000001')
    expect(formatQuantity(-0)).toBe('0')
    expect(formatQuantity(Number.NaN)).toBe('—')
  })
})
