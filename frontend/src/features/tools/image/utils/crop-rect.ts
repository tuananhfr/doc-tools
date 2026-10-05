import type { Rect, Rotation, Size } from '../types/image.types'

/** Tám tay nắm của khung cắt, gọi theo hướng la bàn. */
export type CropHandle = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

export const CROP_HANDLES: CropHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

/** Cạnh ngắn nhất của khung cắt (điểm ảnh của ảnh) — nhỏ hơn là hai tay nắm chồng lên nhau, không kéo ra lại được. */
export const MIN_CROP = 16

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)

export function fullRect(bounds: Size): Rect {
  return { x: 0, y: 0, width: bounds.width, height: bounds.height }
}

export function isFullRect(rect: Rect, bounds: Size): boolean {
  return rect.x <= 0 && rect.y <= 0 && rect.width >= bounds.width && rect.height >= bounds.height
}

/** Kích thước ảnh sau khi xoay: 90° và 270° đổi chỗ rộng / cao. */
export function rotatedSize(size: Size, rotation: Rotation): Size {
  return rotation % 180 === 0 ? { width: size.width, height: size.height } : { width: size.height, height: size.width }
}

export function moveRect(rect: Rect, dx: number, dy: number, bounds: Size): Rect {
  return {
    ...rect,
    x: clamp(rect.x + dx, 0, bounds.width - rect.width),
    y: clamp(rect.y + dy, 0, bounds.height - rect.height),
  }
}

/** Khung lớn nhất đúng tỉ lệ `aspect` (rộng / cao), nằm giữa ảnh. */
export function rectForAspect(bounds: Size, aspect: number): Rect {
  const width = Math.min(bounds.width, bounds.height * aspect)
  const height = width / aspect
  return { x: (bounds.width - width) / 2, y: (bounds.height - height) / 2, width, height }
}

/**
 * Kéo một tay nắm đi (dx, dy) điểm ảnh. Cạnh đối diện đứng yên; khung không ra
 * ngoài ảnh và không nhỏ hơn `MIN_CROP`. Có `aspect` thì chiều còn lại chạy
 * theo — tay nắm ở cạnh giữ khung cân quanh trục của nó.
 */
export function resizeRect(rect: Rect, handle: CropHandle, dx: number, dy: number, bounds: Size, aspect: number | null): Rect {
  let left = rect.x
  let top = rect.y
  let right = rect.x + rect.width
  let bottom = rect.y + rect.height

  if (handle.includes('w')) left = clamp(left + dx, 0, right - MIN_CROP)
  if (handle.includes('e')) right = clamp(right + dx, left + MIN_CROP, bounds.width)
  if (handle.includes('n')) top = clamp(top + dy, 0, bottom - MIN_CROP)
  if (handle.includes('s')) bottom = clamp(bottom + dy, top + MIN_CROP, bounds.height)

  if (!aspect) return { x: left, y: top, width: right - left, height: bottom - top }

  const horizontal = handle === 'e' || handle === 'w'
  const vertical = handle === 'n' || handle === 's'
  const centerX = rect.x + rect.width / 2
  const centerY = rect.y + rect.height / 2

  // Chỗ còn trống tính từ điểm neo (cạnh / góc đối diện, hoặc trục giữa với tay nắm ở cạnh).
  const roomX = vertical ? 2 * Math.min(centerX, bounds.width - centerX) : handle.includes('w') ? right : bounds.width - left
  const roomY = horizontal ? 2 * Math.min(centerY, bounds.height - centerY) : handle.includes('n') ? bottom : bounds.height - top

  let width = right - left
  let height = bottom - top
  // Góc: chiều bị kéo nhiều hơn thì dẫn. Lấy chiều LỚN hơn thì kéo ngang vào trong (và phím mũi tên,
  // vốn chỉ đổi một chiều) không bao giờ thu nhỏ được khung.
  const widthLeads = Math.abs(width - rect.width) >= Math.abs(height - rect.height) * aspect
  if (horizontal || (!vertical && widthLeads)) height = width / aspect
  else width = height * aspect

  const shrink = Math.min(1, roomX / width, roomY / height)
  width *= shrink
  height *= shrink

  return {
    x: vertical ? centerX - width / 2 : handle.includes('w') ? right - width : left,
    y: horizontal ? centerY - height / 2 : handle.includes('n') ? bottom - height : top,
    width,
    height,
  }
}

/** Khung cắt đi theo ảnh khi ảnh xoay 90°. `bounds` là kích thước TRƯỚC khi xoay. */
export function rotateRect(rect: Rect, bounds: Size, direction: 'cw' | 'ccw'): Rect {
  return direction === 'cw'
    ? { x: bounds.height - rect.y - rect.height, y: rect.x, width: rect.height, height: rect.width }
    : { x: rect.y, y: bounds.width - rect.x - rect.width, width: rect.height, height: rect.width }
}

/** Làm tròn về điểm ảnh nguyên, vẫn nằm trong ảnh — canvas không cắt được nửa điểm ảnh. */
export function snapRect(rect: Rect, bounds: Size): Rect {
  const x = clamp(Math.round(rect.x), 0, bounds.width - 1)
  const y = clamp(Math.round(rect.y), 0, bounds.height - 1)
  return {
    x,
    y,
    width: clamp(Math.round(rect.width), 1, bounds.width - x),
    height: clamp(Math.round(rect.height), 1, bounds.height - y),
  }
}
