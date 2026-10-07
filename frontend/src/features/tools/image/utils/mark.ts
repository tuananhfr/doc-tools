import type { Point, Size } from '../types/image.types'
import type { MarkAnchor, MarkColor, MarkState } from '../types/mark.types'

export const INITIAL_MARK: MarkState = {
  boxes: [],
  stamp: { text: '', anchor: 'bottomRight', sizeRatio: 0.05, opacity: 0.8, color: 'red', tile: false },
}

/** Màu GHI VÀO ẢNH (điểm ảnh của tệp ra) — không phải màu giao diện, không theo theme. */
export const MARK_COLOR: Record<MarkColor, string> = { red: '#c8102e', black: '#111111', white: '#ffffff' }

export const MARK_COLORS: MarkColor[] = ['red', 'black', 'white']

/** Vị trí neo theo hai trục: 0 = mép trái / trên, 0,5 = giữa, 1 = mép phải / dưới. */
const ANCHOR_AXES: Record<MarkAnchor, readonly [number, number]> = {
  topLeft: [0, 0],
  topCenter: [0.5, 0],
  topRight: [1, 0],
  middleLeft: [0, 0.5],
  center: [0.5, 0.5],
  middleRight: [1, 0.5],
  bottomLeft: [0, 1],
  bottomCenter: [0.5, 1],
  bottomRight: [1, 1],
}

/** Có gì để ghi vào ảnh không — không thì ảnh ra giống hệt ảnh gốc. */
export function hasMarks(state: MarkState): boolean {
  return state.boxes.length > 0 || state.stamp.text.trim() !== ''
}

/** Cỡ chữ (px) của dấu trên một ảnh / canvas cỡ `size`. */
export function stampFontSize(size: Size, sizeRatio: number): number {
  return Math.max(8, Math.round(Math.min(size.width, size.height) * sizeRatio))
}

/** Lề từ mép ảnh tới dấu: theo cỡ chữ, để dấu to không dính mép còn dấu nhỏ không trôi vào giữa. */
export const stampMargin = (fontSize: number): number => Math.round(fontSize * 0.6)

/**
 * Hệ số thu chữ để dòng dấu nằm gọn trong chiều rộng ảnh (trừ lề). 1 = vừa sẵn.
 * Dòng chữ dài trên ảnh dọc mà không thu là bị cắt ở mép, không ai thấy cho tới khi mở tệp.
 */
export function stampFit(size: Size, textWidth: number, margin: number): number {
  const room = size.width - 2 * margin
  return textWidth <= room || textWidth <= 0 ? 1 : Math.max(0.1, room / textWidth)
}

/** Góc trên-trái của khung chữ `text` khi neo vào `anchor`. */
export function stampOrigin(size: Size, text: Size, anchor: MarkAnchor, margin: number): Point {
  const [fx, fy] = ANCHOR_AXES[anchor]
  return {
    x: margin + fx * Math.max(0, size.width - 2 * margin - text.width),
    y: margin + fy * Math.max(0, size.height - 2 * margin - text.height),
  }
}

/** Góc nghiêng của dấu lặp (radian) — ngược chiều kim đồng hồ. */
export const TILE_ANGLE = -Math.PI / 6

/**
 * Tâm các dấu lặp, trong hệ toạ độ ĐÃ xoay quanh tâm ảnh (gốc ở tâm). Phủ cả
 * hình tròn ngoại tiếp ảnh nên xoay góc nào cũng không hở góc; hàng lẻ so le nửa bước.
 */
export function tileCenters(size: Size, text: Size): Point[] {
  const radius = Math.hypot(size.width, size.height) / 2
  const stepX = text.width + text.height * 3
  const stepY = text.height * 4
  if (stepX <= 0 || stepY <= 0) return []
  const centers: Point[] = []
  const rows = Math.ceil(radius / stepY)
  const columns = Math.ceil(radius / stepX) + 1
  for (let row = -rows; row <= rows; row++) {
    const shift = row % 2 === 0 ? 0 : stepX / 2
    for (let column = -columns; column <= columns; column++) centers.push({ x: column * stepX + shift, y: row * stepY })
  }
  return centers
}
