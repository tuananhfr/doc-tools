import type { Rect } from '../types/markup.types'
import type { Rgb } from './decorations'
import type { Point, Size } from './page-geometry'

/** Một nét bút: các điểm theo hệ của ô ký (`SIGNATURE_PAD`). */
export type Stroke = Point[]

/** Hệ toạ độ của ô ký — ô co giãn theo màn hình nhưng nét luôn lưu theo khung này. */
export const SIGNATURE_PAD: Size = { width: 600, height: 220 }

/** Bề dày nét theo hệ của ô ký. */
export const SIGNATURE_STROKE = 3.5

export const SIGNATURE_INK = {
  black: 'black',
  blue: 'blue',
} as const

export type SignatureInk = (typeof SIGNATURE_INK)[keyof typeof SIGNATURE_INK]

/** Màu mực GHI VÀO TỆP — không theo theme, như `DOCUMENT_COLORS`. */
export const INK_COLOR: Record<SignatureInk, Rgb> = {
  black: [0.07, 0.07, 0.09],
  blue: [0.1, 0.24, 0.62],
}

const round = (value: number) => Math.round(value * 10) / 10

/**
 * Đường vẽ của một nét: nối qua TRUNG ĐIỂM các đoạn bằng đường cong bậc hai.
 * Nối thẳng từng điểm thì chữ ký ký nhanh (ít điểm) gãy khúc thấy rõ.
 */
export function strokePath(points: Stroke): string {
  if (points.length === 0) return ''
  const [first] = points
  // Một cú chạm: đoạn dài 0 với đầu nét tròn vẫn ra một chấm (dấu chấm trên chữ "i").
  if (points.length === 1) return `M${round(first.x)} ${round(first.y)}L${round(first.x)} ${round(first.y)}`
  let d = `M${round(first.x)} ${round(first.y)}`
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index]
    const next = points[index + 1]
    d += `Q${round(point.x)} ${round(point.y)} ${round((point.x + next.x) / 2)} ${round((point.y + next.y) / 2)}`
  }
  const last = points[points.length - 1]
  return `${d}L${round(last.x)} ${round(last.y)}`
}

/** Khung ôm sát mọi nét, nới ra nửa bề dày nét + `padding`, không vượt ô ký. `null` = chưa có nét nào. */
export function strokeBounds(strokes: Stroke[], padding = 4): Rect | null {
  const points = strokes.flat()
  if (points.length === 0) return null
  const grow = SIGNATURE_STROKE / 2 + padding
  const left = Math.max(0, Math.min(...points.map((point) => point.x)) - grow)
  const top = Math.max(0, Math.min(...points.map((point) => point.y)) - grow)
  const right = Math.min(SIGNATURE_PAD.width, Math.max(...points.map((point) => point.x)) + grow)
  const bottom = Math.min(SIGNATURE_PAD.height, Math.max(...points.map((point) => point.y)) + grow)
  return { x: left, y: top, width: right - left, height: bottom - top }
}
