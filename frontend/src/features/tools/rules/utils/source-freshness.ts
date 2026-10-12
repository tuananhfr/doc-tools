import { vietnamToday } from '../services/signed-rules'

/** Ngưỡng khi không hỏi được máy chủ (gói không có `sourceId` hoặc sổ nguồn không trả lời) — khớp mặc định `sources.staleDays`. */
export const DEFAULT_STALE_DAYS = 90

export type LegalSourceStatus = 'verified' | 'superseded' | 'revoked'

export interface LegalSource {
  sourceId: string
  issuer: string
  documentNumber: string
  jurisdiction: string
  article: string | null
  validFrom: string | null
  validTo: string | null
  checkedAt: string
  evidenceUrl: string
  status: LegalSourceStatus
}

export type FreshnessWarning = 'revoked' | 'superseded' | 'expired' | 'stale' | 'unchecked'

const DATE = /^\d{4}-\d{2}-\d{2}$/

function isRealDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

/** Ngày kiểm theo lịch Việt Nam: `retrievedAt` của gói là mốc ISO UTC, đọc thẳng `slice(0, 10)` là lệch một ngày sau 17h UTC. */
export function toCheckedDate(value: unknown): string | null {
  if (typeof value !== 'string') return null
  if (DATE.test(value)) return isRealDate(value) ? value : null
  const time = Date.parse(value)
  return Number.isNaN(time) ? null : vietnamToday(new Date(time))
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)
}

/** Không đọc được ngày thì coi là cũ: im lặng ở đây là ngầm nói "số liệu còn mới". */
export function isStale(checkedAt: string | null | undefined, now: Date, days: number): boolean {
  const checked = toCheckedDate(checkedAt)
  return !checked || daysBetween(checked, vietnamToday(now)) > days
}

export function freshnessWarnings(input: { checkedAt: string | null; validTo?: string | null; status?: LegalSourceStatus }, now: Date, staleDays: number): FreshnessWarning[] {
  const warnings: FreshnessWarning[] = []
  if (input.status === 'revoked') warnings.push('revoked')
  if (input.status === 'superseded') warnings.push('superseded')
  // Ngày cuối vẫn còn hiệu lực: so theo ngày lịch, giống `inEffect` của gói ký.
  if (input.validTo && input.validTo < vietnamToday(now)) warnings.push('expired')
  if (!toCheckedDate(input.checkedAt)) warnings.push('unchecked')
  else if (isStale(input.checkedAt, now, staleDays)) warnings.push('stale')
  return warnings
}

const STATUSES: readonly LegalSourceStatus[] = ['verified', 'superseded', 'revoked']
const optionalDate = (value: unknown) => value === null || (typeof value === 'string' && DATE.test(value) && isRealDate(value))
const shortText = (value: unknown, max: number) => typeof value === 'string' && value.length > 0 && value.length <= max

/** Kiểm lại hình dạng chứ không tin máy chủ: dòng nháp hay link http không được lên trang công cụ. */
export function parseLegalSource(value: unknown): LegalSource | null {
  if (!value || typeof value !== 'object') return null
  const item = value as Record<string, unknown>
  const ok = shortText(item.sourceId, 64) && shortText(item.issuer, 200) && shortText(item.documentNumber, 100) && shortText(item.jurisdiction, 100)
    && (item.article === null || shortText(item.article, 200))
    && optionalDate(item.validFrom) && optionalDate(item.validTo)
    && typeof item.checkedAt === 'string' && DATE.test(item.checkedAt) && isRealDate(item.checkedAt)
    && typeof item.evidenceUrl === 'string' && item.evidenceUrl.startsWith('https://')
    && STATUSES.includes(item.status as LegalSourceStatus)
  if (!ok) return null
  return {
    sourceId: item.sourceId as string, issuer: item.issuer as string, documentNumber: item.documentNumber as string,
    jurisdiction: item.jurisdiction as string, article: (item.article as string | null) ?? null,
    validFrom: (item.validFrom as string | null) ?? null, validTo: (item.validTo as string | null) ?? null,
    checkedAt: item.checkedAt as string, evidenceUrl: item.evidenceUrl as string, status: item.status as LegalSourceStatus,
  }
}
