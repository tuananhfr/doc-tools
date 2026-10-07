import { looseKey, type AddressMapping, type ProvinceMerge } from '../rules/rule-kinds'
import { rulePackageDigest, type RulePackage } from '../rules/rule-package'

/** Kinds a source check can compare against; others have no tool page that uses them yet. */
export const SOURCE_CHECK_KINDS = ['electricity', 'vat', 'payroll', 'addresses'] as const
export type SourceCheckKind = (typeof SOURCE_CHECK_KINDS)[number]

const MAX_WARD_MATCHES = 30

/**
 * How a change names what it touches. `field` only allows [A-Za-z0-9_.-], so array items use dot
 * indexes and Vietnamese place names go in before/after, never in the field.
 */
const FIELD_HINTS: Record<SourceCheckKind, string> = {
  electricity: 'field = "tiers.<i>.price" | "tiers.<i>.upTo" (i từ 0); before/after là số dạng chuỗi, giá đồng/kWh chưa VAT.',
  vat: 'field = "percent"; before/after là phần trăm, ví dụ "8".',
  payroll: 'field = "selfDeduct" | "dependentDeduct" | "referenceSalary" | "minWages.<0-3>" | "employee.social" | "employee.health" | "employee.unemployment" | "employer.<...>" | "brackets.<i>.upTo" | "brackets.<i>.rate"; tỉ lệ ghi dạng 0.08.',
  addresses: 'field = "ward" (một dòng: before "Xã cũ, Huyện cũ, Tỉnh cũ → Xã mới, Tỉnh mới", after là bản đúng) hoặc "province" (before/after "Tỉnh mới: tỉnh cũ 1, tỉnh cũ 2").',
}

/** The national ward table is ~11k rows; the agent gets counts plus the rows matching what it asked. */
function addressData(data: unknown, query: string) {
  const record = (data ?? {}) as { provinces?: ProvinceMerge[]; wards?: AddressMapping[] }
  const wards = Array.isArray(record.wards) ? record.wards : []
  const needle = looseKey(query)
  const matches = needle ? wards.filter((row) => looseKey(`${row.oldWard} ${row.oldDistrict} ${row.oldProvince} ${row.newWard} ${row.newProvince}`).includes(needle)) : []
  return {
    provinces: Array.isArray(record.provinces) ? record.provinces : [],
    wardCount: wards.length,
    ...(needle ? { wardMatches: matches.slice(0, MAX_WARD_MATCHES), wardMatchCount: matches.length } : { wardNote: 'Truyền query (tên xã/phường/huyện/tỉnh) để xem các dòng liên quan.' }),
  }
}

export function describePackage(kind: SourceCheckKind, item: RulePackage | null, query: string) {
  if (!item) return null
  return {
    snapshotId: rulePackageDigest(item),
    effectiveFrom: item.effectiveFrom,
    effectiveTo: item.effectiveTo ?? null,
    source: { title: item.source.title, url: item.source.url, retrievedAt: item.source.retrievedAt },
    data: kind === 'addresses' ? addressData(item.data, query) : item.data,
  }
}

export const fieldHint = (kind: SourceCheckKind) => FIELD_HINTS[kind]
