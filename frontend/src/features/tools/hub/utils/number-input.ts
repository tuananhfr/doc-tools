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

/**
 * Đọc một SỐ TIỀN người dùng gõ tay. Khác `parseDecimal` ở đúng một chỗ: dấu
 * chấm / phẩy theo sau bởi ĐÚNG ba chữ số là dấu nhóm nghìn — "150.000" là một
 * trăm năm mươi nghìn, không phải một trăm rưỡi. Với kích thước thì "1.500" là
 * 1,5 m; với tiền Việt thì gần như chắc chắn là một nghìn rưỡi.
 *
 * Vẫn là đoán, nên màn dùng hàm này phải in lại con số đã hiểu cạnh kết quả.
 */
export function parseMoney(input: string): number | null {
  const text = input.replace(/\s/g, '')
  if (/^\d{1,3}([.,]\d{3})+$/.test(text) && !(text.includes('.') && text.includes(','))) return Number(text.replace(/[.,]/g, ''))
  const value = parseDecimal(text)
  return value === null || value < 0 ? null : value
}

/** `money`: số tiền ("1.500" = một nghìn rưỡi) · `decimal`: số đo, tỉ lệ ("1,5") · `integer`: đếm (người, tháng). */
export type NumberKind = 'money' | 'decimal' | 'integer'

/** Luật của một ô số — khai NGOÀI component, dùng chung cho `NumberField` và phép tính của trang. */
export interface NumberRule { kind: NumberKind; min?: number; max?: number }

export type NumberCheck =
  | { state: 'empty' }
  | { state: 'ok'; value: number }
  | { state: 'invalid' | 'integer' | 'range'; value: number | null }

/**
 * Ô `type="number"` của trình duyệt gọt "30.000.000" thành 30 mà không báo gì —
 * trang tính lương từng ra "Thực nhận 28 đ". Mọi ô số đi qua đây để ô và phép
 * tính hiểu con số y như nhau, và hiểu sai thì ô nói ra.
 */
export function checkNumber(text: string, rule: NumberRule): NumberCheck {
  if (text.trim() === '') return { state: 'empty' }
  const value = rule.kind === 'money' ? parseMoney(text) : parseDecimal(text)
  if (value === null) return { state: 'invalid', value: null }
  if (rule.kind === 'integer' && !Number.isInteger(value)) return { state: 'integer', value }
  if ((rule.min !== undefined && value < rule.min) || (rule.max !== undefined && value > rule.max)) return { state: 'range', value }
  return { state: 'ok', value }
}

/** Con số dùng được cho phép tính, `null` khi ô trống hoặc sai luật. */
export function readNumber(text: string, rule: NumberRule): number | null {
  const checked = checkNumber(text, rule)
  return checked.state === 'ok' ? checked.value : null
}

// 10 chữ số có nghĩa: đủ cho mọi phép đổi đơn vị, và gọt được đuôi nhiễu của số thực (0,30000000000000004).
const QUANTITY: Intl.NumberFormatOptions = { maximumSignificantDigits: 10 }

/** In một đại lượng theo ngôn ngữ trang ("1.234,5" ở bản tiếng Việt). */
export function formatQuantity(value: number): string {
  if (!Number.isFinite(value)) return '—'
  // `-0` in ra "-0".
  return numberFormat(QUANTITY).format(value === 0 ? 0 : value)
}
