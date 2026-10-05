/** Chế độ phóng của cửa sổ xem trang: vừa khung, vừa chiều ngang, hoặc tỉ lệ cố định (1 = 100%). */
export type ZoomMode = 'page' | 'width' | number

export const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4] as const

const EPSILON = 0.001

export interface Box {
  width: number
  height: number
}

/** Tỉ lệ hiển thị thật của một chế độ phóng trong khung đang có. */
export function resolveZoom(mode: ZoomMode, page: Box, frame: Box): number {
  if (typeof mode === 'number') return mode
  if (page.width <= 0 || page.height <= 0 || frame.width <= 0 || frame.height <= 0) return 1
  const byWidth = frame.width / page.width
  return mode === 'width' ? byWidth : Math.min(byWidth, frame.height / page.height)
}

/**
 * Bậc phóng kế tiếp tính từ tỉ lệ ĐANG HIỂN THỊ — "vừa trang" thường ra số lẻ
 * (0,83…), bấm + phải lên 1, không nhảy về đầu thang. Đã ngoài thang (bản vẽ A0
 * vừa trang còn 0,3) thì bấm thu nhỏ giữ nguyên chứ không bật NGƯỢC lên 0,5.
 */
export function stepZoom(current: number, direction: 1 | -1): number {
  if (direction > 0) {
    return ZOOM_STEPS.find((step) => step > current + EPSILON) ?? Math.max(current, ZOOM_STEPS[ZOOM_STEPS.length - 1])
  }
  const lower = ZOOM_STEPS.filter((step) => step < current - EPSILON)
  return lower.length > 0 ? lower[lower.length - 1] : Math.min(current, ZOOM_STEPS[0])
}

/**
 * Số điểm ảnh canvas trên mỗi px CSS (ở 100%) cần vẽ: đủ nét cho màn hình
 * mật độ cao, không vượt trần diện tích canvas.
 */
export function targetPixelRatio(zoom: number, devicePixelRatio: number, page: Box, maxArea: number): number {
  return Math.min(zoom * devicePixelRatio, Math.sqrt(maxArea / (page.width * page.height)))
}
