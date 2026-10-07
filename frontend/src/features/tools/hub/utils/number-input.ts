import { numberFormat } from '@/i18n/intl'

/**
 * Đọc con số người dùng gõ tay. Nhận dấu thập phân là phẩy lẫn chấm ("2,5" /
 * "2.5") và cách viết nhóm nghìn của cả hai kiểu ("1.234,5" / "1,234.5").
 *
 * MỘT dấu đứng một mình luôn được hiểu là dấu THẬP PHÂN: "1.500" là một phẩy
 * năm, không phải một nghìn rưỡi. Không đoán được ý người gõ, nên màn nào dùng
 * hàm này phải in lại con số đã hiểu (`formatQuantity`) cạnh kết quả.
 *
 * `null` = chưa phải một con số.
 */
export function parseDecimal(input: string): number | null {
  const text = input.replace(/\s/g, '')
  if (!/^[-+]?[\d.,]*\d[\d.,]*$/.test(text)) return null

  const lastComma = text.lastIndexOf(',')
  const lastDot = text.lastIndexOf('.')
  let normalized: string

  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.'
    const group = decimal === ',' ? '.' : ','
    normalized = text.split(group).join('')
    if (normalized.split(decimal).length > 2) return null
    normalized = normalized.replace(decimal, '.')
  } else {
    const mark = lastComma >= 0 ? ',' : '.'
    const parts = text.split(mark)
    // Dấu lặp lại ("1.234.567") chỉ có thể là dấu nhóm nghìn.
    normalized = parts.length > 2 ? parts.join('') : parts.join('.')
  }

  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

// 10 chữ số có nghĩa: đủ cho mọi phép đổi đơn vị, và gọt được đuôi nhiễu của số thực (0,30000000000000004).
const QUANTITY: Intl.NumberFormatOptions = { maximumSignificantDigits: 10 }

/** In một đại lượng theo ngôn ngữ trang ("1.234,5" ở bản tiếng Việt). */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '—'
  // `-0` in ra "-0".
  return numberFormat(QUANTITY).format(value === 0 ? 0 : value)
}
