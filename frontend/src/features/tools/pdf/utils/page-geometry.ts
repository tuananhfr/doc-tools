/**
 * Hai hệ toạ độ của một trang PDF:
 * - "Nhìn thấy" (visual): gốc góc TRÊN-trái, y hướng xuống, đã áp `/Rotate` —
 *   đúng như người đọc thấy; lớp phủ SVG và bố cục trang trí dùng hệ này.
 * - "User space" của PDF: gốc góc DƯỚI-trái, y hướng lên, CHƯA xoay, lệch theo
 *   CropBox — pdf-lib vẽ trong hệ này.
 * Vẽ thẳng bằng toạ độ nhìn thấy lên trang có `/Rotate 90` là số trang chạy
 * dọc mép trái; trang có CropBox lệch gốc là chữ rơi ra ngoài vùng hiển thị.
 */

export interface Size {
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** CropBox trong user space (pt). */
export interface PageBox extends Size {
  x: number
  y: number
}

export type QuarterTurn = 0 | 90 | 180 | 270

export type TextAlign = 'start' | 'middle' | 'end'

/** Khổ A4 (pt). */
export const A4_SIZE: Size = { width: 595.28, height: 841.89 }

export function normalizeRotation(angle: number): QuarterTurn {
  const turns = Math.round((((angle % 360) + 360) % 360) / 90) % 4
  return (turns * 90) as QuarterTurn
}

export function visualSize(box: Size, rotation: QuarterTurn): Size {
  return rotation === 90 || rotation === 270 ? { width: box.height, height: box.width } : { width: box.width, height: box.height }
}

/** Điểm trên trang nhìn thấy → user space. `/Rotate` xoay trang THEO chiều kim đồng hồ khi hiển thị. */
export function visualToUser(point: Point, box: PageBox, rotation: QuarterTurn): Point {
  const { x, y } = point
  let ux: number
  let uy: number
  switch (rotation) {
    case 0:
      ux = x
      uy = box.height - y
      break
    case 90:
      ux = y
      uy = x
      break
    case 180:
      ux = box.width - x
      uy = y
      break
    case 270:
      ux = box.width - y
      uy = box.height - x
      break
  }
  return { x: box.x + ux, y: box.y + uy }
}

/** Ngược của `visualToUser`: toạ độ PDFium / pdf-lib trả về → trang nhìn thấy. */
export function userToVisual(point: Point, box: PageBox, rotation: QuarterTurn): Point {
  const ux = point.x - box.x
  const uy = point.y - box.y
  switch (rotation) {
    case 0:
      return { x: ux, y: box.height - uy }
    case 90:
      return { x: uy, y: ux }
    case 180:
      return { x: box.width - ux, y: uy }
    case 270:
      return { x: box.height - uy, y: box.width - ux }
  }
}

/**
 * Khung GỐC (đã áp `/Rotate` nguồn) → khung NHÌN THẤY sau khi xoay thêm `turn`
 * theo chiều kim đồng hồ. Đánh dấu tay lưu ở khung gốc để xoay trang sau này
 * dấu vẫn bám nội dung; màn hình vẽ ở khung nhìn thấy.
 */
export function baseToVisual(point: Point, base: Size, turn: QuarterTurn): Point {
  const { x, y } = point
  switch (turn) {
    case 0:
      return { x, y }
    case 90:
      return { x: base.height - y, y: x }
    case 180:
      return { x: base.width - x, y: base.height - y }
    case 270:
      return { x: y, y: base.width - x }
  }
}

export function visualToBase(point: Point, base: Size, turn: QuarterTurn): Point {
  const { x, y } = point
  switch (turn) {
    case 0:
      return { x, y }
    case 90:
      return { x: y, y: base.height - x }
    case 180:
      return { x: base.width - x, y: base.height - y }
    case 270:
      return { x: base.width - y, y: x }
  }
}

/** Khung chữ nhật trên trang nhìn thấy → khung gốc (`visual` = khổ trang nhìn thấy). */
export function visualRectToBase(rect: { x: number; y: number; width: number; height: number }, visual: Size, turn: QuarterTurn) {
  const base = visualSize(visual, turn)
  const a = visualToBase({ x: rect.x, y: rect.y }, base, turn)
  const b = visualToBase({ x: rect.x + rect.width, y: rect.y + rect.height }, base, turn)
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(b.x - a.x), height: Math.abs(b.y - a.y) }
}

/** `baseToVisual` dạng ma trận SVG `matrix(a b c d e f)`. */
export function baseToVisualMatrix(base: Size, turn: QuarterTurn): [number, number, number, number, number, number] {
  switch (turn) {
    case 0:
      return [1, 0, 0, 1, 0, 0]
    case 90:
      return [0, 1, -1, 0, base.height, 0]
    case 180:
      return [-1, 0, 0, -1, base.width, base.height]
    case 270:
      return [0, -1, 1, 0, 0, base.width]
  }
}

/**
 * Hướng trục x / y của một khung đã xoay `turn`, đo trong khung gốc. Chữ gõ
 * trên trang đang xoay 90° chạy theo `x` = hướng LÊN của khung gốc.
 */
export function turnAxes(turn: QuarterTurn): { x: Point; y: Point } {
  switch (turn) {
    case 0:
      return { x: { x: 1, y: 0 }, y: { x: 0, y: 1 } }
    case 90:
      return { x: { x: 0, y: -1 }, y: { x: 1, y: 0 } }
    case 180:
      return { x: { x: -1, y: 0 }, y: { x: 0, y: -1 } }
    case 270:
      return { x: { x: 0, y: 1 }, y: { x: -1, y: 0 } }
  }
}

/** Góc chữ trong user space để trên trang nhìn thấy chữ nghiêng đúng `visualAngle` (độ, ngược chiều kim đồng hồ). */
export function userAngle(visualAngle: number, rotation: QuarterTurn): number {
  return (((visualAngle + rotation) % 360) + 360) % 360
}

/**
 * Điểm bắt đầu đường chân chữ (hệ nhìn thấy) cho một dòng rộng `width`, căn
 * theo `align` quanh `anchor`, nghiêng `angle` độ. `baselineShift` > 0 đẩy
 * đường chân chữ xuống phía dưới dòng — dùng để căn giữa theo chiều cao chữ.
 */
export function textStart(anchor: Point, width: number, align: TextAlign, angle: number, baselineShift = 0): Point {
  const radians = (angle * Math.PI) / 180
  const along = { x: Math.cos(radians), y: -Math.sin(radians) }
  const down = { x: Math.sin(radians), y: Math.cos(radians) }
  const offset = align === 'start' ? 0 : align === 'middle' ? width / 2 : width
  return {
    x: anchor.x - offset * along.x + baselineShift * down.x,
    y: anchor.y - offset * along.y + baselineShift * down.y,
  }
}
