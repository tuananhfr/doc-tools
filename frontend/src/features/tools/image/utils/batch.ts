import { stem, uniqueNames } from '@/features/tools/shared'
import type { Size } from '../types/image.types'

/** Cách đổi cỡ áp cho cả lô. `edge` = cạnh dài; `width` / `height` giữ tỉ lệ theo cạnh còn lại. */
export type ResizeMode = 'keep' | 'edge' | 'width' | 'height' | 'percent'

export interface ResizeRule {
  mode: ResizeMode
  /** Điểm ảnh, hoặc phần trăm khi `mode = 'percent'`. Bỏ qua khi `keep`. */
  value: number
}

export const RESIZE_LIMIT: Record<Exclude<ResizeMode, 'keep'>, { min: number; max: number }> = {
  edge: { min: 16, max: 16000 },
  width: { min: 16, max: 16000 },
  height: { min: 16, max: 16000 },
  percent: { min: 1, max: 100 },
}

/** Giá trị gõ vào có dùng được cho cách đổi cỡ này không. */
export function isResizeValue(mode: ResizeMode, value: number | null): value is number {
  if (mode === 'keep') return true
  const limit = RESIZE_LIMIT[mode]
  return value !== null && Number.isInteger(value) && value >= limit.min && value <= limit.max
}

/**
 * Kích thước ảnh ra. KHÔNG BAO GIỜ phóng to: ảnh nhỏ hơn đích giữ nguyên cỡ —
 * phóng to chỉ thêm dung lượng, không thêm chi tiết.
 */
export function resizeTo(size: Size, rule: ResizeRule): Size {
  const scale = scaleOf(size, rule)
  if (scale >= 1) return { width: size.width, height: size.height }
  return { width: Math.max(1, Math.round(size.width * scale)), height: Math.max(1, Math.round(size.height * scale)) }
}

function scaleOf(size: Size, { mode, value }: ResizeRule): number {
  switch (mode) {
    case 'keep':
      return 1
    case 'edge':
      return value / Math.max(size.width, size.height)
    case 'width':
      return value / size.width
    case 'height':
      return value / size.height
    case 'percent':
      return value / 100
  }
}

/** Ký tự Windows không cho đặt tên tệp, và ký tự điều khiển. */
const ILLEGAL = /[\\/:*?"<>|\p{Cc}]/gu

export const RENAME_TOKENS = ['{name}', '{n}'] as const

/** Mẫu có đánh số thì mọi tên đều khác nhau; không thì trùng tên sẽ được thêm "(2)". */
export const DEFAULT_PATTERN = '{name}'

/** Vì sao mẫu tên không dùng được; null = dùng được. */
export function patternProblem(pattern: string): string | null {
  const text = pattern.trim()
  if (!text) return 'Nhập mẫu tên tệp, ví dụ {name} hoặc anh-{n}.'
  if (text.replace(/\{name\}|\{n\}/g, '').match(ILLEGAL)) return 'Tên tệp không được chứa \\ / : * ? " < > |'
  if (/[{}]/.test(text.replace(/\{name\}|\{n\}/g, ''))) return 'Chỉ có hai chỗ điền: {name} (tên gốc) và {n} (số thứ tự).'
  return null
}

export interface RenameRule {
  pattern: string
  /** Số của ảnh đầu tiên khi mẫu có `{n}`. */
  start: number
}

/**
 * Tên tệp ra của cả lô (đã có đuôi). `{n}` đệm số 0 theo số LỚN NHẤT của lô để
 * trình quản lý tệp xếp "anh-02" trước "anh-10". Tên trùng được thêm "(2)".
 */
export function renameAll(names: string[], extensions: string[], { pattern, start }: RenameRule): string[] {
  const digits = Math.max(2, String(start + names.length - 1).length)
  const template = pattern.trim() || DEFAULT_PATTERN
  return uniqueNames(
    names.map((name, index) => {
      const base = template
        .replaceAll('{name}', stem(name))
        .replaceAll('{n}', String(start + index).padStart(digits, '0'))
        .replace(ILLEGAL, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        // Windows lặng lẽ bỏ dấu chấm / khoảng trắng cuối tên.
        .replace(/[. ]+$/, '')
      return `${base || 'anh'}.${extensions[index]}`
    }),
  )
}
