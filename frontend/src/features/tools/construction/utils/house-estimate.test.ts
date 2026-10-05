import { describe, expect, it } from 'vitest'
import { DEFAULT_FACTORS, estimateHouse } from './house-estimate'

describe('estimateHouse', () => {
  it('applies each editable factor to its area and avoids double-counting turnkey prices', () => {
    const base = { floorArea: 80, upperFloors: 2, rooftopRoomArea: 20, terraceArea: 40, yardArea: 0, basePrice: 3_000_000, finishingPrice: 5_000_000, finishingIncludesBase: true, pileCost: 20_000_000, factors: { ...DEFAULT_FACTORS } }
    const result = estimateHouse(base)
    expect(result?.convertedArea).toBe(80 * .5 + 80 * 3 + 20 + 40 * .5 + 20 * .5)
    expect(result?.total).toBe((result?.convertedArea ?? 0) * 5_000_000 + 20_000_000)
    expect(estimateHouse({ ...base, finishingIncludesBase: false })?.total).toBe((result?.convertedArea ?? 0) * 8_000_000 + 20_000_000)
  })

  it('rejects invalid or excessive values', () => {
    const input = { floorArea: 80, upperFloors: 2, rooftopRoomArea: 0, terraceArea: 0, yardArea: 0, basePrice: 0, finishingPrice: 0, finishingIncludesBase: false, pileCost: 0, factors: { ...DEFAULT_FACTORS } }
    expect(estimateHouse({ ...input, floorArea: -1 })).toBeNull()
    expect(estimateHouse({ ...input, upperFloors: 100 })).toBeNull()
    expect(estimateHouse({ ...input, factors: { ...DEFAULT_FACTORS, roof: 500 } })).toBeNull()
  })
})
