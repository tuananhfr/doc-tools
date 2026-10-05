export interface CanvasCap {
  maxSide: number
  maxArea: number
}

/**
 * Trần canvas an toàn trên mọi trình duyệt: iOS Safari từ chối canvas quá
 * ~16,7 triệu điểm ảnh (vẽ ra trắng, không báo lỗi) — khổ A0 ở 150 DPI đã vượt.
 */
export const CANVAS_CAP: CanvasCap = { maxSide: 8000, maxArea: 16_000_000 }

/** Tỉ lệ vẽ lớn nhất ≤ `scale` mà canvas cho khung `size` (pt) vẫn nằm trong trần. */
export function fitScale(size: { width: number; height: number }, scale: number, cap: CanvasCap = CANVAS_CAP): number {
  const width = size.width * scale
  const height = size.height * scale
  if (width <= 0 || height <= 0) return scale
  return scale * Math.min(1, cap.maxSide / Math.max(width, height), Math.sqrt(cap.maxArea / (width * height)))
}
