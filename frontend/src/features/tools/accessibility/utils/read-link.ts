import { READ_ERROR_CODES, type ReadErrorCode, type ReadSource } from '../types/read-listen.types'

/** Lỗi của nhánh link: 8 mã chung của Đọc & Nghe + `RATE_LIMITED` (429/503 — chỉ nhánh có máy chủ mới gặp). */
export type ReadLinkFailure = ReadErrorCode | 'RATE_LIMITED'

const isReadCode = (value: unknown): value is ReadErrorCode => typeof value === 'string' && (READ_ERROR_CODES as readonly string[]).includes(value)

/**
 * Chuẩn hoá ô nhập: thiếu scheme thì thêm `https://` (người dùng hay dán "vnexpress.net/…"), còn
 * `http://` thì từ chối chứ không tự nâng — máy chủ chỉ nhận HTTPS, tự nâng là đọc nhầm sang trang khác.
 */
export function normalizeReadLink(raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed || trimmed.length > 2048) return null
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  let url: URL
  try { url = new URL(candidate) } catch { return null }
  if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) return null
  return url.href
}

/** Mã lỗi máy chủ → mã hiển thị. Mã lạ / thiếu coi là UNSUPPORTED để người dùng luôn có đường "dán văn bản". */
export function readLinkFailureFrom(status: number, code: unknown): ReadLinkFailure {
  if (status === 429 || status === 503 || code === 'READ_RATE_LIMITED' || code === 'READ_BUSY') return 'RATE_LIMITED'
  return isReadCode(code) ? code : 'UNSUPPORTED'
}

/**
 * Kiểm lại phản hồi của `/read/extract` trước khi đưa vào trình đọc — dữ liệu từ máy chủ coi như
 * dữ liệu lạ: sai hình dạng là null (UNSUPPORTED), không đọc nửa vời.
 */
export function readSourceFromExtract(value: unknown): ReadSource | null {
  if (!value || typeof value !== 'object') return null
  const { ok, document, warnings } = value as Record<string, unknown>
  if (ok !== true || !document || typeof document !== 'object') return null
  const { title, sourceUrl, segments } = document as Record<string, unknown>
  if (typeof title !== 'string' || typeof sourceUrl !== 'string' || !Array.isArray(segments)) return null
  const texts = segments.map((segment) => (segment && typeof segment === 'object' && typeof (segment as { text?: unknown }).text === 'string' ? (segment as { text: string }).text.trim() : ''))
  const text = texts.filter(Boolean).join('\n\n')
  if (!text) return null
  return { kind: 'link', title, text, sourceUrl, warnings: Array.isArray(warnings) ? warnings.filter(isReadCode) : [] }
}

/** Tên miền để hiện dòng "Nguồn"; null khi URL hỏng. */
export function readLinkHost(sourceUrl: string): string | null {
  try { return new URL(sourceUrl).hostname } catch { return null }
}
