/**
 * Thứ trang chọn công cụ nhớ TRÊN MÁY NÀY: công cụ vừa dùng.
 * Không gửi đi đâu — khách chưa đăng nhập cũng dùng, và bản miễn phí hứa không
 * thu thập gì.
 */
const RECENT_KEY = 'erpcons.tools.recent'

export const RECENT_LIMIT = 5

/** Đưa công cụ vừa mở lên đầu, không lặp, giữ tối đa `RECENT_LIMIT`. */
export function pushRecent(list: string[], slug: string): string[] {
  return [slug, ...list.filter((item) => item !== slug)].slice(0, RECENT_LIMIT)
}

/** Dữ liệu trong localStorage có thể do bản cũ hoặc tay người ghi — không tin kiểu của nó. */
export function parseRecent(raw: string | null): string[] {
  if (!raw) return []
  try {
    const value: unknown = JSON.parse(raw)
    if (!Array.isArray(value)) return []
    return value.filter((item): item is string => typeof item === 'string').slice(0, RECENT_LIMIT)
  } catch {
    return []
  }
}

// Chế độ riêng tư có thể chặn storage: đọc không được thì coi như chưa có gì.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function write(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Không ghi được thì lần sau hiện mặc định — không đáng báo lỗi.
  }
}

export function readRecentTools(): string[] {
  return parseRecent(read(RECENT_KEY))
}

export function trackRecentTool(slug: string): void {
  write(RECENT_KEY, JSON.stringify(pushRecent(readRecentTools(), slug)))
}
