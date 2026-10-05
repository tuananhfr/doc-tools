export interface UnitPrice {
  price: number
  quantity: number
  perUnit: number
}

export function compareUnitPrices(a: Pick<UnitPrice, 'price' | 'quantity'>, b: Pick<UnitPrice, 'price' | 'quantity'>): { items: [UnitPrice, UnitPrice]; cheaper: 0 | 1 | null; savingPercent: number } | null {
  if (![a.price, a.quantity, b.price, b.quantity].every(Number.isFinite) || a.price < 0 || b.price < 0 || a.quantity <= 0 || b.quantity <= 0) return null
  const first = { ...a, perUnit: a.price / a.quantity }
  const second = { ...b, perUnit: b.price / b.quantity }
  const cheaper = first.perUnit === second.perUnit ? null : first.perUnit < second.perUnit ? 0 : 1
  const costly = Math.max(first.perUnit, second.perUnit)
  return { items: [first, second], cheaper, savingPercent: costly === 0 ? 0 : 100 * Math.abs(first.perUnit - second.perUnit) / costly }
}
