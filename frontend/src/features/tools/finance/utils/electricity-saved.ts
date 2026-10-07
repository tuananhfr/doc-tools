import { isRecord, stringAt, stringsAt } from '@/utils/saved-payload'

export interface ElectricityInput {
  mode: 'electricity' | 'water'
  kwh: string
  households: string
  vat: string
  lines: string
  water: { cubicMeters: string; price: string; fee: string; vat: string }
}

const WATER_KEYS = ['cubicMeters', 'price', 'fee', 'vat'] as const
const SHORT = 40
const LINES = 20_000

/** What the save bar stores: the inputs only. The bill is recomputed on open, with whatever rules apply then. */
export function electricitySnapshot(input: ElectricityInput): Record<string, unknown> | null {
  const empty = input.mode === 'water' ? input.water.cubicMeters === '' && input.water.price === '' : input.kwh === '' && input.lines.trim() === ''
  return empty ? null : { v: 1, ...input, water: { ...input.water } }
}

export function parseElectricitySaved(payload: unknown): ElectricityInput | null {
  if (!isRecord(payload) || payload.v !== 1 || (payload.mode !== 'electricity' && payload.mode !== 'water') || !isRecord(payload.water)) return null
  const fields = stringsAt(payload, ['kwh', 'households', 'vat'], SHORT)
  const lines = stringAt(payload, 'lines', LINES)
  const water = stringsAt(payload.water, WATER_KEYS, SHORT)
  return fields && lines !== null && water ? { mode: payload.mode, ...fields, lines, water } : null
}
