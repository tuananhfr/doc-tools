import type { MoneyGroup } from '../config/money-presets'

/** Giá trị `?nhom=` viết không dấu cho link dễ đọc / dễ gõ — cố ý khác id nội bộ của nhóm. */
const QUERY_BY_GROUP: Record<MoneyGroup, string> = { percent: 'phan-tram', tax: 'vat', profit: 'loi-nhuan', split: 'chia' }

export function moneyCalcGroupFromQuery(query: string | null): MoneyGroup | null {
  const value = query?.trim().toLowerCase()
  return (Object.keys(QUERY_BY_GROUP) as MoneyGroup[]).find((group) => QUERY_BY_GROUP[group] === value) ?? null
}

export function moneyCalcGroupQuery(group: MoneyGroup): string {
  return QUERY_BY_GROUP[group]
}
