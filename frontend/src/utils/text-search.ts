import { searchKey } from './vn-normalize'

/**
 * Chuẩn hoá giống cách người dùng đọc: bỏ dấu, không phân biệt hoa/thường —
 * chính là `searchKey` của thư viện chuẩn hoá tiếng Việt (đặc tả DCP-017), nên
 * ký tự vô hình, dấu kiểu cũ (hoà/hòa) và chữ Cyrillic trông như Latin cũng ra
 * cùng khoá với bản PHP.
 */
export function normalizeTextSearch(value: unknown): string {
  return searchKey(value)
}

function collectText(value: unknown, seen: WeakSet<object>, output: string[]): void {
  if (value === null || value === undefined) return
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    output.push(String(value))
    return
  }
  if (value instanceof Date) {
    output.push(value.toISOString())
    return
  }
  if (typeof value !== 'object' || seen.has(value)) return

  seen.add(value)
  if (Array.isArray(value)) {
    value.forEach((item) => collectText(item, seen, output))
    return
  }
  Object.values(value).forEach((item) => collectText(item, seen, output))
}

/**
 * Tìm trên toàn bộ giá trị của một dòng. Mỗi từ khoá chỉ cần xuất hiện ở đâu
 * đó trong dòng, không cần đúng hoa/thường, dấu tiếng Việt hay nguyên câu.
 */
export function matchesTextSearch(value: unknown, keyword: string): boolean {
  const tokens = normalizeTextSearch(keyword).split(' ').filter(Boolean)
  if (tokens.length === 0) return true

  const parts: string[] = []
  collectText(value, new WeakSet<object>(), parts)
  const haystack = normalizeTextSearch(parts.join(' '))
  return tokens.every((token) => haystack.includes(token))
}

