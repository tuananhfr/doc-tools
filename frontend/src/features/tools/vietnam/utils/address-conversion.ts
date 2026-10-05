import { normalizeTextSearch } from '@/utils/text-search'

export interface AddressMapping { oldProvince: string; oldDistrict: string; oldWard: string; newProvince: string; newWard: string }
export type AddressResult = { input: string; output: string; status: 'matched' | 'unmatched' | 'ambiguous' }
export type AddressIndex = Map<string, AddressMapping | null>

const addressKey = (province: string, district: string, ward: string) => [province, district, ward].map(normalizeTextSearch).join('|')

export function indexAddressMappings(mappings: AddressMapping[]): AddressIndex {
  const index: AddressIndex = new Map()
  for (const row of mappings) {
    const key = addressKey(row.oldProvince, row.oldDistrict, row.oldWard)
    index.set(key, index.has(key) ? null : row)
  }
  return index
}

export function validateAddressMappings(value: unknown): AddressMapping[] | null {
  if (!Array.isArray(value) || value.length > 100_000) return null
  const keys = new Set<string>()
  const mappings: AddressMapping[] = []
  for (const item of value) {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    const names = ['oldProvince', 'oldDistrict', 'oldWard', 'newProvince', 'newWard'] as const
    if (names.some((key) => typeof row[key] !== 'string' || !(row[key] as string).trim() || (row[key] as string).length > 150)) return null
    const entry = row as unknown as AddressMapping
    const key = addressKey(entry.oldProvince, entry.oldDistrict, entry.oldWard)
    if (keys.has(key)) return null
    keys.add(key)
    mappings.push(entry)
  }
  return mappings
}

export function parseAddressMappings(text: string): AddressMapping[] | null {
  const lines = text.trim().split('\n').filter(Boolean)
  if (!lines.length) return []
  const rows = lines.map((line) => {
    const parts = line.split('|').map((part) => part.trim())
    if (parts.length !== 5) return null
    const [oldProvince, oldDistrict, oldWard, newProvince, newWard] = parts
    return { oldProvince, oldDistrict, oldWard, newProvince, newWard }
  })
  return rows.includes(null) ? null : validateAddressMappings(rows)
}

export function convertAddress(input: string, mappings: AddressMapping[] | AddressIndex): AddressResult {
  const parts = input.split(',').map((part) => part.trim()).filter(Boolean)
  if (parts.length < 3) return { input, output: input, status: 'unmatched' }
  const [ward, district, province] = parts.slice(-3)
  const index = mappings instanceof Map ? mappings : indexAddressMappings(mappings)
  const key = addressKey(province, district, ward)
  if (!index.has(key)) return { input, output: input, status: 'unmatched' }
  const row = index.get(key)
  if (!row) return { input, output: input, status: 'ambiguous' }
  return { input, output: [...parts.slice(0, -3), row.newWard, row.newProvince].join(', '), status: 'matched' }
}
