import { withBase } from '@/utils/url'

export interface SignedRulePackage<T = unknown> {
  version: 1
  kind: string
  keyId: string
  effectiveFrom: string
  effectiveTo?: string
  publishedAt: string
  source: { title: string; url: string; retrievedAt: string; sha256: string }
  data: T
  signature: string
}

export interface VerifiedRulePackage<T = unknown> extends SignedRulePackage<T> { digest: string }

/** Gói đang dùng rút gọn cho phần kiểm nguồn AI: đủ để gọi tên gói, không kèm dữ liệu. */
export function ruleSnapshot(item: VerifiedRulePackage | null) {
  return item ? { id: item.digest, effectiveFrom: item.effectiveFrom, sourceTitle: item.source.title, sourceUrl: item.source.url } : null
}

/** Kết quả tra gói: phân biệt "chưa có gói" với "gói hỏng" và "không gọi được máy chủ" để trang báo đúng việc. */
export type RuleLookup<T> =
  | { state: 'ready'; current: VerifiedRulePackage<T>; upcoming: VerifiedRulePackage<T> | null }
  | { state: 'none'; upcoming: VerifiedRulePackage<T> | null }
  | { state: 'invalid' }
  | { state: 'unavailable' }

/** Trả `null` khi dữ liệu trong gói không đúng hình dạng công cụ cần — chữ ký đúng chưa có nghĩa là dữ liệu dùng được. */
export type RuleDataParser<T> = (data: unknown) => T | null

const VIETNAM_DATE = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Ngày lịch ở Việt Nam — phải khớp `vietnamToday()` của backend, nếu không quanh nửa đêm UTC (7 giờ sáng) hai bên chọn hai gói khác nhau. */
export function vietnamToday(now = new Date()): string {
  const parts = Object.fromEntries(VIETNAM_DATE.formatToParts(now).map(({ type, value }) => [type, value]))
  return `${parts.year}-${parts.month}-${parts.day}`
}

/** "2027-01-01" → "01/01/2027"; cắt chuỗi, không qua Date để khỏi lệch múi giờ. */
export function formatRuleDate(date: string): string {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function canonical(value: unknown): string {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value)
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value)
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`
  throw new Error('Invalid signed data')
}

function decodeBase64Url(input: string): Uint8Array {
  const raw = atob(input.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (character) => character.charCodeAt(0))
}

async function verifySignature<T>(value: SignedRulePackage<T>, spkiBase64Url: string, expectedKind: string): Promise<boolean> {
  if (value.version !== 1 || value.kind !== expectedKind) return false
  try {
    const { signature, ...unsigned } = value
    const key = await crypto.subtle.importKey('spki', decodeBase64Url(spkiBase64Url) as BufferSource, { name: 'Ed25519' }, false, ['verify'])
    return await crypto.subtle.verify('Ed25519', key, decodeBase64Url(signature) as BufferSource, new TextEncoder().encode(canonical(unsigned)))
  } catch { return false }
}

const inEffect = (value: SignedRulePackage<unknown>, today: string) => value.effectiveFrom <= today && (!value.effectiveTo || value.effectiveTo >= today)

/** Gói hợp lệ VÀ đang hiệu lực vào `today`. */
export async function verifySignedRulePackage<T>(value: SignedRulePackage<T>, spkiBase64Url: string, expectedKind: string, today = vietnamToday()): Promise<boolean> {
  return inEffect(value, today) && verifySignature(value, spkiBase64Url, expectedKind)
}

export async function signedRuleDigest<T>(value: SignedRulePackage<T>): Promise<string> {
  const { signature: _signature, ...unsigned } = value
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(unsigned)))
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function acceptPackage<T>(value: unknown, key: string, kind: string, parse: RuleDataParser<T>, dateOk: (item: SignedRulePackage<unknown>) => boolean): Promise<VerifiedRulePackage<T> | null> {
  if (!value || typeof value !== 'object') return null
  const item = value as SignedRulePackage<unknown>
  if (typeof item.effectiveFrom !== 'string' || !dateOk(item) || !await verifySignature(item, key, kind)) return null
  const data = parse(item.data)
  return data === null ? null : { ...item, data, digest: await signedRuleDigest(item) }
}

/** Kiểm lại ở trình duyệt chứ không tin máy chủ: chữ ký, loại, ngày hiệu lực và hình dạng dữ liệu. */
export async function fetchVerifiedRules<T>(kind: string, parse: RuleDataParser<T>, today = vietnamToday()): Promise<RuleLookup<T>> {
  const key = process.env.NEXT_PUBLIC_RULE_SIGNING_KEY_SPKI
  if (!key || !/^[a-z][a-z0-9-]{0,63}$/.test(kind)) return { state: 'unavailable' }
  let envelope: { ok?: unknown; package?: unknown; upcoming?: unknown }
  try {
    const response = await fetch(withBase(`/api/v1/rules/${kind}`), { cache: 'no-store' })
    if (!response.ok) return { state: 'unavailable' }
    envelope = await response.json()
  } catch { return { state: 'unavailable' } }
  if (!envelope || envelope.ok !== true) return { state: 'unavailable' }
  // Gói sắp tới chỉ để báo trước: hỏng thì bỏ qua, không làm hỏng gói đang dùng (cùng cách với backend).
  const upcoming = envelope.upcoming ? await acceptPackage(envelope.upcoming, key, kind, parse, (item) => item.effectiveFrom > today) : null
  if (!envelope.package) return { state: 'none', upcoming }
  const current = await acceptPackage(envelope.package, key, kind, parse, (item) => inEffect(item, today))
  return current ? { state: 'ready', current, upcoming } : { state: 'invalid' }
}
