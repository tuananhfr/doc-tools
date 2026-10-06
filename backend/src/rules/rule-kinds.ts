/**
 * Per-kind checks run by the operator CLI before signing or staging. Errors mirror the
 * frontend validators (a package that passes here is accepted by the tool pages); the
 * extra bounds catch typos such as a VAT of 80 instead of 8.
 */
export interface RuleCheck { errors: string[]; warnings: string[]; notes: string[] }

export interface AddressMapping { oldProvince: string; oldDistrict: string; oldWard: string; newProvince: string; newWard: string }
export interface ProvinceMerge { name: string; old: string[] }

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value)
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const money = (value: number) => Math.round(value).toLocaleString('en-US')

/** Same idea as the frontend `searchKey`: case- and diacritic-insensitive. */
export function looseKey(value: string): string {
  return value.normalize('NFD').replace(/\p{Mn}/gu, '').replace(/đ/gi, 'd').toLowerCase().replace(/\s+/g, ' ').trim()
}

function checkTiers(value: unknown, errors: string[]) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) { errors.push('tiers must be an array of 1-20 tiers'); return null }
  let previous = 0
  for (const [index, tier] of value.entries()) {
    if (!isRecord(tier)) { errors.push(`tiers[${index}] must be an object`); return null }
    if (!isNumber(tier.price) || tier.price < 0 || tier.price > 1_000_000) errors.push(`tiers[${index}].price must be 0-1,000,000`)
    if (tier.upTo === null) { if (index !== value.length - 1) errors.push(`tiers[${index}].upTo may be null only on the last tier`) }
    else if (!isNumber(tier.upTo) || !Number.isInteger(tier.upTo) || tier.upTo <= previous || tier.upTo > 1_000_000) errors.push(`tiers[${index}].upTo must be an increasing whole number`)
    else previous = tier.upTo
  }
  if (isRecord(value.at(-1)) && (value.at(-1) as Record<string, unknown>).upTo !== null) errors.push('the last tier must have upTo: null')
  return errors.length ? null : value as { upTo: number | null; price: number }[]
}

function checkElectricity(data: unknown, result: RuleCheck) {
  if (!isRecord(data)) { result.errors.push('data must be an object'); return }
  const tiers = checkTiers(data.tiers, result.errors)
  if (data.vatPercent !== undefined) {
    if (!isNumber(data.vatPercent) || data.vatPercent < 0 || data.vatPercent > 20) result.errors.push('vatPercent must be 0-20')
    else result.warnings.push('vatPercent in an electricity package is a fallback; publish VAT as its own `vat` package')
  }
  for (const tier of tiers ?? []) if (tier.price < 500 || tier.price > 10_000) result.warnings.push(`tier price ${tier.price} is outside the usual 500-10,000 VND/kWh range`)
}

function checkVat(data: unknown, result: RuleCheck) {
  if (!isRecord(data) || !isNumber(data.percent) || data.percent < 0 || data.percent > 20) result.errors.push('data.percent must be a number from 0 to 20')
}

function checkRates(value: unknown, name: string, errors: string[]) {
  if (!isRecord(value) || [value.social, value.health, value.unemployment].some(rate => !isNumber(rate) || rate < 0 || rate > 1)) errors.push(`${name} needs social, health and unemployment rates from 0 to 1`)
}

function checkPayroll(data: unknown, result: RuleCheck) {
  const { errors } = result
  if (!isRecord(data)) { errors.push('data must be an object'); return }
  for (const key of ['selfDeduct', 'dependentDeduct', 'referenceSalary'] as const) {
    if (!isNumber(data[key]) || (data[key] as number) < 0 || (data[key] as number) > 1e10) errors.push(`${key} must be 0-1e10`)
  }
  if (data.referenceSalary === 0) errors.push('referenceSalary must not be 0')
  if (!Array.isArray(data.minWages) || data.minWages.length !== 4 || data.minWages.some(wage => !isNumber(wage) || wage < 0 || wage > 1e10)) errors.push('minWages must be 4 amounts (regions 1-4)')
  checkRates(data.employee, 'employee', errors)
  checkRates(data.employer, 'employer', errors)
  const brackets = data.brackets
  if (!Array.isArray(brackets) || brackets.length < 1 || brackets.length > 20) { errors.push('brackets must be an array of 1-20 brackets'); return }
  let previous = 0
  for (const [index, bracket] of brackets.entries()) {
    if (!isRecord(bracket) || !isNumber(bracket.rate) || bracket.rate < 0 || bracket.rate > 1) { errors.push(`brackets[${index}].rate must be 0-1`); continue }
    if (bracket.upTo === null) { if (index !== brackets.length - 1) errors.push(`brackets[${index}].upTo may be null only on the last bracket`) }
    else if (!isNumber(bracket.upTo) || bracket.upTo <= previous || bracket.upTo > 1e12) errors.push(`brackets[${index}].upTo must increase`)
    else previous = bracket.upTo
  }
  if (!isRecord(brackets.at(-1)) || (brackets.at(-1) as Record<string, unknown>).upTo !== null) errors.push('the last bracket must have upTo: null')
}

const wardKey = (row: AddressMapping) => [row.oldProvince, row.oldDistrict, row.oldWard].map(looseKey).join('|')
const isName = (value: unknown) => typeof value === 'string' && value.trim().length > 0 && value.length <= 150

function checkAddresses(data: unknown, result: RuleCheck) {
  const { errors, warnings, notes } = result
  if (!isRecord(data)) { errors.push('data must be an object'); return }
  const owner = new Map<string, string>()
  if (data.provinces !== undefined) {
    if (!Array.isArray(data.provinces) || data.provinces.length > 100) errors.push('provinces must be an array of at most 100 entries')
    else for (const [index, province] of data.provinces.entries()) {
      if (!isRecord(province) || !isName(province.name) || !Array.isArray(province.old) || !province.old.length || province.old.length > 10 || !province.old.every(isName)) { errors.push(`provinces[${index}] needs a name and 1-10 old names`); continue }
      for (const old of province.old as string[]) {
        const previous = owner.get(looseKey(old))
        if (previous && previous !== province.name) errors.push(`old province "${old}" belongs to both "${previous}" and "${province.name}"`)
        owner.set(looseKey(old), province.name as string)
      }
    }
  }
  if (data.wards !== undefined) {
    if (!Array.isArray(data.wards) || data.wards.length > 100_000) { errors.push('wards must be an array of at most 100,000 rows'); return }
    const exact = new Set<string>()
    const targets = new Map<string, Set<string>>()
    const provinceOf = new Map<string, string>()
    let duplicates = 0
    for (const [index, row] of data.wards.entries()) {
      if (!isRecord(row) || !(['oldProvince', 'oldDistrict', 'oldWard', 'newProvince', 'newWard'] as const).every(key => isName(row[key]))) { errors.push(`wards[${index}] needs oldProvince, oldDistrict, oldWard, newProvince, newWard`); if (errors.length > 20) return; continue }
      const mapping = row as unknown as AddressMapping
      const full = `${wardKey(mapping)}>${looseKey(mapping.newWard)}|${looseKey(mapping.newProvince)}`
      if (exact.has(full)) duplicates++
      exact.add(full)
      const key = wardKey(mapping)
      targets.set(key, (targets.get(key) ?? new Set()).add(`${mapping.newWard}, ${mapping.newProvince}`))
      const oldProvince = looseKey(mapping.oldProvince)
      const known = provinceOf.get(oldProvince)
      if (known && known !== looseKey(mapping.newProvince)) errors.push(`old province "${mapping.oldProvince}" maps to more than one new province (row ${index})`)
      provinceOf.set(oldProvince, looseKey(mapping.newProvince))
    }
    const split = [...targets.values()].filter(set => set.size > 1).length
    if (duplicates) warnings.push(`${duplicates} ward rows repeat an earlier row exactly; the tool ignores the repeats`)
    if (split) notes.push(`${split} old wards map to several new wards; the tool asks the user to choose`)
    notes.push(`${targets.size} old wards, ${provinceOf.size} old provinces`)
  }
  const provinces = Array.isArray(data.provinces) ? data.provinces.length : 0
  const wards = Array.isArray(data.wards) ? data.wards.length : 0
  if (!provinces && !wards) errors.push('provide provinces, wards or both')
}

const CHECKS: Record<string, (data: unknown, result: RuleCheck) => void> = { electricity: checkElectricity, vat: checkVat, payroll: checkPayroll, addresses: checkAddresses }

export function checkRuleData(kind: string, data: unknown): RuleCheck {
  const result: RuleCheck = { errors: [], warnings: [], notes: [] }
  const check = CHECKS[kind]
  if (check) check(data, result)
  else result.warnings.push(`no checks are defined for kind "${kind}"; only the signature and envelope were verified`)
  return result
}

function electricityBill(kwh: number, tiers: { upTo: number | null; price: number }[]) {
  let previous = 0
  let total = 0
  for (const tier of tiers) {
    const boundary = tier.upTo ?? kwh
    total += Math.max(0, Math.min(kwh, boundary) - previous) * tier.price
    previous = boundary
  }
  return total
}

function flatten(value: unknown, path: string, out: Map<string, string>) {
  if (Array.isArray(value)) value.forEach((item, index) => flatten(item, `${path}[${index}]`, out))
  else if (isRecord(value)) for (const key of Object.keys(value).sort()) flatten(value[key], path ? `${path}.${key}` : key, out)
  else out.set(path, JSON.stringify(value))
}

function fieldDiff(before: unknown, after: unknown, limit = 30): string[] {
  const left = new Map<string, string>()
  const right = new Map<string, string>()
  flatten(before, '', left)
  flatten(after, '', right)
  const lines: string[] = []
  for (const path of new Set([...left.keys(), ...right.keys()])) {
    if (left.get(path) !== right.get(path)) lines.push(`${path}: ${left.get(path) ?? '(none)'} -> ${right.get(path) ?? '(none)'}`)
  }
  return lines.length > limit ? [...lines.slice(0, limit), `... ${lines.length - limit} more changes`] : lines
}

function addressDiff(before: unknown, after: unknown): string[] {
  const index = (data: unknown) => {
    const targets = new Map<string, Set<string>>()
    const wards = isRecord(data) && Array.isArray(data.wards) ? data.wards as AddressMapping[] : []
    for (const row of wards) targets.set(wardKey(row), (targets.get(wardKey(row)) ?? new Set()).add(looseKey(`${row.newWard}|${row.newProvince}`)))
    return new Map([...targets].map(([key, set]) => [key, [...set].sort().join('/')]))
  }
  const left = index(before)
  const right = index(after)
  const added = [...right.keys()].filter(key => !left.has(key)).length
  const removed = [...left.keys()].filter(key => !right.has(key)).length
  const retargeted = [...right.keys()].filter(key => left.has(key) && left.get(key) !== right.get(key)).length
  const provinces = (data: unknown) => isRecord(data) && Array.isArray(data.provinces) ? (data.provinces as ProvinceMerge[]).map(item => item.name).sort().join(', ') : '(none)'
  const lines = [`old wards: ${left.size} -> ${right.size} (${added} added, ${removed} removed, ${retargeted} pointed to a different new ward)`]
  if (provinces(before) !== provinces(after)) lines.push(`provinces: ${provinces(before)} -> ${provinces(after)}`)
  return lines
}

/** Before/after figures an operator can sanity-check against the official text. */
export function compareRuleData(kind: string, before: unknown, after: unknown): string[] {
  if (kind === 'electricity' && isRecord(before) && isRecord(after) && Array.isArray(before.tiers) && Array.isArray(after.tiers)) {
    const lines = [50, 100, 200, 300, 400, 700].map(kwh => {
      const old = electricityBill(kwh, before.tiers as never)
      const next = electricityBill(kwh, after.tiers as never)
      const change = old ? ` (${next >= old ? '+' : ''}${((next - old) / old * 100).toFixed(1)}%)` : ''
      return `${kwh} kWh before VAT: ${money(old)} -> ${money(next)} VND${change}`
    })
    if (before.vatPercent !== after.vatPercent) lines.push(`vatPercent: ${before.vatPercent ?? '(none)'} -> ${after.vatPercent ?? '(none)'}`)
    return lines
  }
  if (kind === 'addresses') return addressDiff(before, after)
  const lines = fieldDiff(before, after)
  return lines.length ? lines : ['data is identical']
}
