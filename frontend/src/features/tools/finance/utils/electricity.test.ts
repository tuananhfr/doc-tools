import { describe, expect, it } from 'vitest'
import { electricityBill, parseElectricityRules, validateElectricityTiers, waterBill } from './electricity'
import { parseVatRule } from './vat-rule'

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

describe('signed electricity data', () => {
  it('accepts tiers with or without a VAT rate and rejects a bad rate', () => {
    const tiers = [{ upTo: 50, price: 1000 }, { upTo: null, price: 2000 }]
    expect(parseElectricityRules({ tiers })).toEqual({ tiers })
    expect(parseElectricityRules({ tiers, vatPercent: 8 })).toEqual({ tiers, vatPercent: 8 })
    expect(parseElectricityRules({ tiers, vatPercent: '8' })).toBeNull()
    expect(parseVatRule({ percent: 10 })).toEqual({ percent: 10 })
    expect(parseVatRule({ percent: -1 })).toBeNull()
  })
})
