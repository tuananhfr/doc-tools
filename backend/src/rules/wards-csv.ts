import { looseKey, type AddressMapping, type ProvinceMerge } from './rule-kinds'

/** RFC 4180 rows: quoted fields may hold commas, doubled quotes and line breaks. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let index = 0; index < text.length; index++) {
    const char = text[index]
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index++ }
      else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index++
      row.push(field); rows.push(row); row = []; field = ''
    } else field += char
  }
  if (field || row.length) { row.push(field); rows.push(row) }
  return rows.filter(cells => cells.some(cell => cell.trim()))
}

const COLUMNS = { oldProvince: 'tinh_cu', oldDistrict: 'huyen_cu', oldWard: 'xa_cu', newWard: 'xa_moi', newProvince: 'tinh_moi' } as const

/**
 * Turns the ward table (`tinh_cu,huyen_cu,xa_cu,xa_moi,tinh_moi`, extra columns ignored) into
 * `addresses` data. Province merges are derived from the same rows so both halves come from one
 * signed source; exact repeats are dropped, one old ward mapping to several new wards is kept.
 */
export function wardsFromCsv(text: string): { data: { provinces: ProvinceMerge[]; wards: AddressMapping[] }; duplicatesRemoved: number } {
  const [header, ...lines] = parseCsv(text.replace(/^﻿/, ''))
  if (!header) throw new Error('Ward CSV is empty')
  const names = header.map(name => name.trim().toLowerCase())
  const position = Object.fromEntries(Object.entries(COLUMNS).map(([key, column]) => [key, names.indexOf(column)])) as Record<keyof typeof COLUMNS, number>
  const missing = Object.entries(position).filter(([, index]) => index < 0).map(([key]) => COLUMNS[key as keyof typeof COLUMNS])
  if (missing.length) throw new Error(`Ward CSV is missing columns: ${missing.join(', ')}`)

  const seen = new Set<string>()
  const wards: AddressMapping[] = []
  const merges = new Map<string, Set<string>>()
  let duplicatesRemoved = 0
  for (const [index, cells] of lines.entries()) {
    const row = Object.fromEntries(Object.entries(position).map(([key, column]) => [key, (cells[column] ?? '').trim()])) as unknown as AddressMapping
    if (Object.values(row).some(value => !value)) throw new Error(`Ward CSV line ${index + 2} has an empty required cell`)
    const key = Object.values(row).map(looseKey).join('|')
    if (seen.has(key)) { duplicatesRemoved++; continue }
    seen.add(key)
    wards.push(row)
    merges.set(row.newProvince, (merges.get(row.newProvince) ?? new Set()).add(row.oldProvince))
  }
  const provinces = [...merges].map(([name, old]) => ({ name, old: [...old].sort((a, b) => a.localeCompare(b, 'vi')) })).sort((a, b) => a.name.localeCompare(b.name, 'vi'))
  return { data: { provinces, wards }, duplicatesRemoved }
}
