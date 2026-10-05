import { parseDecimal } from '@/features/tools/hub'
import type { MoneyPreset, MoneyRow, MoneyUnit } from '../config/money-presets'

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

const MONEY = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })
const PERCENT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 })

/** In một giá trị theo đơn vị của nó: tiền tới hai số lẻ, phần trăm kèm dấu %. */
export function formatMoneyValue(value: number, unit: MoneyUnit): string {
  if (!Number.isFinite(value)) return '—'
  const safe = Object.is(value, -0) || Math.abs(value) < 0.005 ? 0 : value
  if (unit === 'percent') return `${PERCENT.format(safe)}%`
  return MONEY.format(safe)
}

export type MoneyOutcome =
  | { ok: true; rows: MoneyRow[]; expression: string }
  /** `invalid` = ô có chữ nhưng không đọc ra số hợp lệ; `reason` = số hợp lệ nhưng phép tính không có nghĩa. */
  | { ok: false; invalid: string[]; reason: string | null }

function readInput(text: string, unit: MoneyUnit): number | null {
  if (unit === 'money') return parseMoney(text)
  const value = parseDecimal(text)
  if (value === null || value < 0) return null
  // Số người: nguyên dương — "2,5 người" là gõ nhầm, không phải một phép chia.
  if (unit === 'count') return Number.isInteger(value) && value >= 1 ? value : null
  return value
}

/**
 * Tính một preset từ chữ người dùng gõ. Ô bắt buộc còn trống = chưa đủ dữ liệu
 * (không phải lỗi); ô tuỳ chọn trống = 0. Biểu thức trả về dùng lại đúng các số
 * đã hiểu, để "150.000" gõ vào hiện lại thành "150.000" chứ không phải "150".
 */
export function evaluatePreset(preset: MoneyPreset, texts: Record<string, string>): MoneyOutcome {
  const values: Record<string, number> = {}
  const shown: Record<string, string> = {}
  const invalid: string[] = []
  let missing = false

  for (const input of preset.inputs) {
    const text = (texts[input.key] ?? '').trim()
    if (text === '') {
      if (input.optional) {
        values[input.key] = 0
        shown[input.key] = '0'
      } else missing = true
      continue
    }
    const value = readInput(text, input.unit)
    if (value === null) invalid.push(input.key)
    else {
      values[input.key] = value
      shown[input.key] = input.unit === 'percent' ? PERCENT.format(value) : MONEY.format(value)
    }
  }

  if (missing || invalid.length > 0) return { ok: false, invalid, reason: null }

  const rows = preset.compute(values)
  if (typeof rows === 'string') return { ok: false, invalid: [], reason: rows }
  if (rows.some((row) => !Number.isFinite(row.value))) return { ok: false, invalid: [], reason: 'Số quá lớn để tính.' }
  return { ok: true, rows, expression: preset.explain(shown) }
}

/** `vat-add · v1` — in cạnh kết quả để đối chiếu khi công thức đổi phiên bản. */
export function presetCode(preset: MoneyPreset): string {
  return `${preset.id} · v${preset.version}`
}
