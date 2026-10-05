import { describe, expect, it } from 'vitest'
import { calculateLoan, calculateSavings } from './loan'
import { compareUnitPrices } from './unit-price'

describe('finance tools', () => {
  it('settles the loan balance for both payment methods', () => {
    for (const method of ['annuity', 'equal-principal'] as const) {
      const result = calculateLoan(12000000, 12, 12, method)
      expect(result?.rows).toHaveLength(12)
      expect(result?.rows[11].balance).toBe(0)
      expect(result?.rows.reduce((sum, row) => sum + row.principal, 0)).toBeCloseTo(12000000)
    }
    expect(calculateLoan(100, -1, 12, 'annuity')).toBeNull()
  })

  it('compares prices per common quantity', () => {
    const result = compareUnitPrices({ price: 120000, quantity: 2 }, { price: 65000, quantity: 1 })
    expect(result?.cheaper).toBe(0)
    expect(result?.items[0].perUnit).toBe(60000)
    expect(compareUnitPrices({ price: 1, quantity: 0 }, { price: 1, quantity: 1 })).toBeNull()
  })

  it('reinvests interest only when a term renews', () => {
    expect(calculateSavings(100000000, 6, 12, 2)?.total).toBeCloseTo(112360000)
    expect(calculateSavings(100000000, 6, 0, 2)).toBeNull()
  })
})
