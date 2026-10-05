export const DEFAULT_FACTORS = {
  foundation: 50,
  basement: 0,
  ground: 100,
  upper: 100,
  rooftopRoom: 100,
  terrace: 50,
  roof: 50,
  yard: 50,
} as const

export type FactorKey = keyof typeof DEFAULT_FACTORS
export type Factors = Record<FactorKey, number>

export interface EstimateInput {
  floorArea: number
  upperFloors: number
  rooftopRoomArea: number
  terraceArea: number
  yardArea: number
  basePrice: number
  finishingPrice: number
  finishingIncludesBase: boolean
  pileCost: number
  factors: Factors
}

export interface EstimateRow { name: string; area: number; factor: number; convertedArea: number }

export function estimateHouse(input: EstimateInput) {
  const nonnegative = [input.floorArea, input.rooftopRoomArea, input.terraceArea, input.yardArea, input.basePrice, input.finishingPrice, input.pileCost]
  if (nonnegative.some((value) => !Number.isFinite(value) || value < 0) || !Number.isInteger(input.upperFloors) || input.upperFloors < 0 || input.upperFloors > 50) return null
  if (Object.values(input.factors).some((value) => !Number.isFinite(value) || value < 0 || value > 400)) return null
  const rows: EstimateRow[] = []
  const add = (name: string, area: number, factor: number) => {
    if (area > 0 && factor > 0) rows.push({ name, area, factor, convertedArea: area * factor / 100 })
  }
  add('Móng', input.floorArea, input.factors.foundation)
  add('Tầng hầm', input.floorArea, input.factors.basement)
  add('Tầng trệt', input.floorArea, input.factors.ground)
  for (let floor = 1; floor <= input.upperFloors; floor++) add(`Lầu ${floor}`, input.floorArea, input.factors.upper)
  add('Tum', input.rooftopRoomArea, input.factors.rooftopRoom)
  add('Sân thượng không mái', input.terraceArea, input.factors.terrace)
  add('Mái', input.rooftopRoomArea > 0 ? input.rooftopRoomArea : input.floorArea, input.factors.roof)
  add('Sân trước/sau', input.yardArea, input.factors.yard)
  const convertedArea = rows.reduce((sum, row) => sum + row.convertedArea, 0)
  const baseCost = input.finishingIncludesBase ? 0 : convertedArea * input.basePrice
  const finishingCost = convertedArea * input.finishingPrice
  return { rows, convertedArea, baseCost, finishingCost, pileCost: input.pileCost, total: baseCost + finishingCost + input.pileCost }
}
