import { describe, expect, it } from 'vitest'
import { MONEY_GROUPS } from '../config/money-presets'
import { moneyCalcGroupFromQuery, moneyCalcGroupQuery } from './money-group-query'

describe('?nhom= của Tính tiền & thuế', () => {
  it('đọc giá trị không dấu trên URL', () => {
    expect(moneyCalcGroupFromQuery('vat')).toBe('tax')
    expect(moneyCalcGroupFromQuery(' VAT ')).toBe('tax')
    expect(moneyCalcGroupFromQuery('phan-tram')).toBe('percent')
    expect(moneyCalcGroupFromQuery('loi-nhuan')).toBe('profit')
    expect(moneyCalcGroupFromQuery('chia')).toBe('split')
  })

  it('bỏ qua giá trị lạ, rỗng, hoặc id nội bộ để trang mở tab mặc định', () => {
    for (const value of [null, '', 'tax', 'percent', 'xyz']) expect(moneyCalcGroupFromQuery(value)).toBeNull()
  })

  it('đi được hai chiều với mọi nhóm', () => {
    for (const group of MONEY_GROUPS) expect(moneyCalcGroupFromQuery(moneyCalcGroupQuery(group.value))).toBe(group.value)
  })
})
