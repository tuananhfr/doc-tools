// Bản sao luật của backend (`backend/src/contributions/contribution-input.ts`): backend từ chối cả đề xuất
// mà chỉ báo chung "không hợp lệ", nên màn phải chỉ ra chỗ sai TRƯỚC khi gửi. Sửa một bên thì sửa cả bên kia.

export type SensitiveKind = 'secret' | 'internalUrl' | 'email' | 'phone'

// Hợp bốn mẫu dưới đây đúng bằng `sensitivePattern` của backend.
const SENSITIVE_PATTERNS: [SensitiveKind, RegExp][] = [
  ['secret', /\bBearer\s+[A-Za-z0-9._~+/-]+|\b(?:api[_-]?key|password|secret|token)\s*[:=]\s*[^\s,;]+/i],
  ['internalUrl', /https?:\/\/(?:localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|[^\s/]+\.internal)/i],
  ['email', /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i],
  ['phone', /(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}\b/i],
]

/** Mọi loại thông tin nhạy cảm có trong chữ — báo một lượt, khỏi xoá xong email mới thấy số điện thoại. Rỗng = backend sẽ nhận. */
export function findSensitive(text: string): SensitiveKind[] {
  return SENSITIVE_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([kind]) => kind)
}

export type SourceUrlCheck = 'ok' | 'invalid' | 'notHttps' | 'unsafe'

export const SOURCE_URL_MAX = 2048

/** Cùng điều kiện với `safeSourceUrl` của backend; chuỗi rỗng = không có nguồn, hợp lệ. */
export function checkSourceUrl(value: string): SourceUrlCheck {
  if (!value) return 'ok'
  if (value.length > SOURCE_URL_MAX) return 'invalid'
  let url: URL
  try { url = new URL(value) } catch { return 'invalid' }
  if (url.protocol !== 'https:') return 'notHttps'
  const host = url.hostname.toLowerCase()
  const unsafe = url.username || url.password || url.hash || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.endsWith('.local') || host.endsWith('.internal')
    || host === 'localhost' || /[?&](?:token|key|sig|auth|session|access)[^=]*=/i.test(url.search) || findSensitive(value).length > 0
  return unsafe ? 'unsafe' : 'ok'
}
