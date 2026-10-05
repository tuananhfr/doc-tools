/**
 * Sinh UUID v4 — dùng cho mã tra cứu request (`X-Correlation-Id`) và, về sau,
 * cho id bản ghi tạo offline (docs/offline/ADR-05-client-uuid.md).
 *
 * `crypto.randomUUID()` CHỈ có trong ngữ cảnh an toàn (HTTPS hoặc localhost).
 * Mở app bằng `http://<IP LAN>:3000` để thử trên điện thoại thì hàm đó là
 * `undefined` — gọi thẳng nó trong interceptor là MỌI request đều vỡ. Vì vậy có
 * đường lui bằng `crypto.getRandomValues()`, hàm này có ở cả ngữ cảnh không an
 * toàn và vẫn là nguồn ngẫu nhiên mật mã, không phải `Math.random()`.
 */
export function newId(): string {
  const c = globalThis.crypto
  if (typeof c?.randomUUID === 'function') return c.randomUUID()

  const bytes = new Uint8Array(16)
  c.getRandomValues(bytes)
  // Bit phiên bản (4) và biến thể (10xx) theo RFC 9562.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
