export interface ElectricityTier { upTo: number | null; price: number }

export function validateElectricityTiers(value: unknown): ElectricityTier[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) return null
  let previous = 0
  const tiers: ElectricityTier[] = []
  for (const [index, item] of value.entries()) {
    if (!item || typeof item !== 'object') return null
    const { upTo, price } = item as Record<string, unknown>
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 1_000_000) return null
    if (upTo === null) { if (index !== value.length - 1) return null }
    else if (typeof upTo !== 'number' || !Number.isInteger(upTo) || upTo <= previous || upTo > 1_000_000) return null
    else previous = upTo
    tiers.push({ upTo: upTo as number | null, price })
  }
  return tiers.at(-1)?.upTo === null ? tiers : null
}

export function electricityBill(kwh: number, tiers: ElectricityTier[], vatPercent: number, households = 1) {
  if (!Number.isFinite(kwh) || kwh < 0 || kwh > 1_000_000 || !Number.isInteger(households) || households < 1 || households > 1000 || !Number.isFinite(vatPercent) || vatPercent < 0 || vatPercent > 100 || !validateElectricityTiers(tiers)) return null
  let previous = 0
  const rows = tiers.map((tier) => {
    const boundary = tier.upTo === null ? kwh : tier.upTo * households
    const units = Math.max(0, Math.min(kwh, boundary) - previous)
    previous = boundary
    return { ...tier, units, amount: units * tier.price }
  })
  const subtotal = rows.reduce((sum, row) => sum + row.amount, 0)
  const vat = subtotal * vatPercent / 100
  return { rows, subtotal, vat, total: subtotal + vat }
}

export function waterBill(cubicMeters: number, price: number, feePercent: number, vatPercent: number) {
  if ([cubicMeters, price, feePercent, vatPercent].some((value) => !Number.isFinite(value) || value < 0) || cubicMeters > 1_000_000 || price > 1_000_000 || feePercent > 100 || vatPercent > 100) return null
  const subtotal = cubicMeters * price
  const fee = subtotal * feePercent / 100
  const vat = subtotal * vatPercent / 100
  return { subtotal, fee, vat, total: subtotal + fee + vat }
}

export interface ElectricityRules { tiers: ElectricityTier[]; vatPercent?: number }

/** `vatPercent` trong gói điện là tuỳ chọn: thuế nên phát hành thành gói `vat` riêng để đổi thuế không phải ký lại bảng giá. */
export function parseElectricityRules(data: unknown): ElectricityRules | null {
  if (!data || typeof data !== 'object') return null
  const { tiers, vatPercent } = data as Record<string, unknown>
  const valid = validateElectricityTiers(tiers)
  if (!valid) return null
  if (vatPercent === undefined) return { tiers: valid }
  return typeof vatPercent === 'number' && Number.isFinite(vatPercent) && vatPercent >= 0 && vatPercent <= 100 ? { tiers: valid, vatPercent } : null
}
