import { parseDecimal, parseMoney } from '@/features/tools/hub'

export interface RuleLine { upTo: number | null; value: number }

export type RuleLinesResult =
  | { ok: true; lines: RuleLine[] }
  /** `line` đếm từ 1 — số dòng người dùng nhìn thấy trong ô. */
  | { ok: false; line: number }

/**
 * Đọc bảng bậc gõ tay, mỗi dòng "ngưỡng; giá trị", dòng cuối ngưỡng là `*`.
 *
 * Bản cũ tách cột bằng dấu phẩy nên "50,1.984" (giá viết kiểu Việt) thành giá
 * 1,984 đ/kWh và hoá đơn ra "218 đ". Giờ cột tách bằng `;`, `|`, tab hoặc khoảng
 * trắng; dấu phẩy chỉ còn là dấu tách khi dòng không có dấu nào kia — và chỉ
 * tách ở dấu phẩy ĐẦU, để vế giá trị vẫn đọc được "1.984" hay "1984,5". Kết
 * quả đã lưu theo kiểu cũ ("50,1984") vì thế vẫn mở được.
 *
 * Ngưỡng là số nguyên đọc như tiền ("10.000.000"); giá trị đọc bằng `value`.
 */
export function parseRuleLines(text: string, value: 'money' | 'decimal'): RuleLinesResult {
  const lines: RuleLine[] = []
  const rows = text.split('\n')
  for (const [index, raw] of rows.entries()) {
    const line = raw.trim()
    if (!line) continue
    const parts = splitColumns(line)
    if (!parts) return { ok: false, line: index + 1 }
    const [threshold, amount] = parts
    const upTo = threshold === '*' ? null : parseMoney(threshold)
    const parsed = value === 'money' ? parseMoney(amount) : parseDecimal(amount)
    if ((upTo !== null && !Number.isInteger(upTo)) || (threshold !== '*' && upTo === null) || parsed === null || parsed < 0) return { ok: false, line: index + 1 }
    lines.push({ upTo, value: parsed })
  }
  return { ok: true, lines }
}

function splitColumns(line: string): [string, string] | null {
  const strong = line.match(/^([^;|\t]+)[;|\t]+(.+)$/)
  if (strong) return [strong[1].trim(), strong[2].trim()]
  const spaced = line.match(/^(\S+)\s+(\S+)$/)
  if (spaced) return [spaced[1], spaced[2]]
  const comma = line.indexOf(',')
  if (comma > 0 && comma < line.length - 1) return [line.slice(0, comma).trim(), line.slice(comma + 1).trim()]
  return null
}

/** Dạng chuẩn để điền lại ô khi áp gói đã ký — cột tách bằng `;` để không lẫn với dấu thập phân. */
export function formatRuleLines(lines: { upTo: number | null; value: number }[]): string {
  return lines.map((line) => `${line.upTo ?? '*'}; ${line.value}`).join('\n')
}
