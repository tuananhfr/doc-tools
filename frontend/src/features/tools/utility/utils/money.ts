import { parseDecimal, parseMoney } from '@/features/tools/hub'
import { translate } from '@/i18n/runtime'
import type { MoneyPreset, MoneyRow, MoneyUnit } from '../config/money-presets'
import { numberFormat } from '@/i18n/intl'

// Bộ đọc tiền đã chuyển sang hub để trang tài chính dùng chung; giữ export cho code và test cũ.
export { parseMoney }

const AMOUNT: Intl.NumberFormatOptions = { maximumFractionDigits: 2 }

/** In một giá trị theo đơn vị của nó: tiền tới hai số lẻ, phần trăm kèm dấu %. */
export function formatMoneyValue(value: number, unit: MoneyUnit): string {
  if (!Number.isFinite(value)) return '—'
  const safe = Object.is(value, -0) || Math.abs(value) < 0.005 ? 0 : value
  if (unit === 'percent') return `${numberFormat(AMOUNT).format(safe)}%`
  return numberFormat(AMOUNT).format(safe)
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
      shown[input.key] = numberFormat(AMOUNT).format(value)
    }
  }

  if (missing || invalid.length > 0) return { ok: false, invalid, reason: null }

  const rows = preset.compute(values)
  if (typeof rows === 'string') return { ok: false, invalid: [], reason: rows }
  if (rows.some((row) => !Number.isFinite(row.value))) return { ok: false, invalid: [], reason: translate('utility:money.errors.tooLarge') }
  return { ok: true, rows, expression: preset.explain(shown) }
}

/** `vat-add · v1` — in cạnh kết quả để đối chiếu khi công thức đổi phiên bản. */
export function presetCode(preset: MoneyPreset): string {
  return `${preset.id} · v${preset.version}`
}
