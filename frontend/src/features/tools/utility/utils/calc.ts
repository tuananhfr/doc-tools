import { formatQuantity, parseDecimal } from '@/features/tools/hub'
import type { CalcFormula } from '../config/calc-formulas'

export type CalcOutcome =
  /** `single` = kết quả cho MỘT cấu kiện, `value` = đã nhân số lượng. */
  | { ok: true; value: number; single: number; quantity: number; expression: string }
  /** `invalid` = ô có chữ nhưng không phải số dương; ô còn trống không tính là lỗi. */
  | { ok: false; invalid: string[] }

const WHOLE = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 })
const SMALL = new Intl.NumberFormat('vi-VN', { maximumSignificantDigits: 4 })

/**
 * In một KẾT QUẢ tính: ba chữ số thập phân (tới gam, tới lít) — mười chữ số của
 * `formatQuantity` là độ chính xác giả với kích thước đo bằng thước. Số nhỏ hơn 1
 * giữ bốn chữ số có nghĩa để tiết diện vài cm² không thành "0".
 */
export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return '—'
  return (Math.abs(value) >= 1 ? WHOLE : SMALL).format(value === 0 ? 0 : value)
}

/** Ô số lượng nằm ngoài danh sách ô của công thức nên có khoá riêng. */
export const QUANTITY_KEY = 'quantity'

/**
 * Tính một công thức từ chữ người dùng gõ. Kích thước phải là số DƯƠNG; số
 * lượng bỏ trống = 1. Biểu thức trả về dùng lại đúng các số đã hiểu — người
 * dùng gõ "1.500" sẽ thấy "1,5" trong phép tính chứ không phải một kết quả lạ.
 */
export function evaluateFormula(formula: CalcFormula, texts: Record<string, string>, quantityText: string): CalcOutcome {
  const values: Record<string, number> = {}
  const shown: Record<string, string> = {}
  const invalid: string[] = []
  let missing = false

  for (const input of formula.inputs) {
    const text = (texts[input.key] ?? '').trim()
    if (text === '') {
      missing = true
      continue
    }
    const value = parseDecimal(text)
    if (value === null || value <= 0) invalid.push(input.key)
    else {
      values[input.key] = value
      shown[input.key] = formatQuantity(value)
    }
  }

  let quantity = 1
  if (quantityText.trim() !== '') {
    const value = parseDecimal(quantityText)
    if (value === null || value <= 0) invalid.push(QUANTITY_KEY)
    else quantity = value
  }

  if (missing || invalid.length > 0) return { ok: false, invalid }

  const single = formula.compute(values)
  if (!Number.isFinite(single)) return { ok: false, invalid: [] }

  const base = formula.explain(shown)
  // Biểu thức có phép cộng thì phải đóng ngoặc trước khi nhân số lượng.
  const expression = quantity === 1 ? base : `${/[+]/.test(base) && !base.startsWith('(') ? `(${base})` : base} × ${formatQuantity(quantity)}`
  return { ok: true, value: single * quantity, single, quantity, expression }
}
