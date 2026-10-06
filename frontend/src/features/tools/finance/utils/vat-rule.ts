export interface VatRule { percent: number }

export function parseVatRule(data: unknown): VatRule | null {
  if (!data || typeof data !== 'object') return null
  const { percent } = data as Record<string, unknown>
  return typeof percent === 'number' && Number.isFinite(percent) && percent >= 0 && percent <= 100 ? { percent } : null
}
