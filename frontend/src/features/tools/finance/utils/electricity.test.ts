import { describe, expect, it } from 'vitest'
import { electricityBill, validateElectricityTiers, waterBill } from './electricity'

describe('electricityBill', () => {
  it('charges each block only for its units', () => {
    const tiers = [{ upTo: 50, price: 1000 }, { upTo: 100, price: 2000 }, { upTo: null, price: 3000 }]
    expect(electricityBill(120, tiers, 10)).toMatchObject({ subtotal: 210000, vat: 21000, total: 231000 })
    expect(electricityBill(0, tiers, 10)?.total).toBe(0)
    expect(electricityBill(120, tiers, 10, 2)?.subtotal).toBe(140000)
  })
  it('rejects overlapping or incomplete schedules', () => {
    expect(validateElectricityTiers([{ upTo: 50, price: 1 }, { upTo: 40, price: 2 }, { upTo: null, price: 3 }])).toBeNull()
    expect(validateElectricityTiers([{ upTo: 50, price: 1 }])).toBeNull()
  })
  it('keeps water fees and tax visible', () => {
    expect(waterBill(10, 10000, 10, 5)).toEqual({ subtotal: 100000, fee: 10000, vat: 5000, total: 115000 })
  })
})
