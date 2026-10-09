/**
 * Lớp nét cọ của công cụ xoá phông, tách khỏi mặt nạ tự dò: đổi độ nhạy chỉ
 * dò lại lớp tự động, nét cọ người dùng đã vẽ vẫn đè lên trên.
 */

/** Giá trị từng điểm của lớp nét cọ. */
export const STROKE_NONE = 0
export const STROKE_KEEP = 1
export const STROKE_ERASE = 2

/** Một nét cọ (nhấn → nhả) — chỉ ghi điểm bị đổi và giá trị cũ, đủ để hoàn tác mà không chép cả lớp (ảnh 2200 px ≈ 4,8 MB/lớp). */
export interface StrokeEdit {
  previous: Map<number, number>
}

/** Số nét giữ lại để hoàn tác — trần để một phiên vẽ dài không giữ RAM vô hạn. */
export const STROKE_HISTORY_LIMIT = 30

export function newStrokeEdit(): StrokeEdit {
  return { previous: new Map() }
}

/** Mặt nạ cuối (1 = giữ, 0 = nền): nét cọ thắng mặt nạ tự dò. Ghi vào `out` để không cấp phát mỗi lần rê chuột. */
export function composeMask(auto: Uint8Array, strokes: Uint8Array, out: Uint8Array = new Uint8Array(auto.length)): Uint8Array {
  for (let index = 0; index < auto.length; index++) {
    const stroke = strokes[index]
    out[index] = stroke === STROKE_KEEP ? 1 : stroke === STROKE_ERASE ? 0 : auto[index]
  }
  return out
}

/** Tô một chấm cọ tròn lên lớp nét cọ, ghi giá trị cũ của điểm lần đầu bị chạm vào `edit`. */
export function paintStroke(strokes: Uint8Array, width: number, height: number, x: number, y: number, radius: number, value: number, edit: StrokeEdit): void {
  const minX = Math.max(0, Math.floor(x - radius)), maxX = Math.min(width - 1, Math.ceil(x + radius))
  const minY = Math.max(0, Math.floor(y - radius)), maxY = Math.min(height - 1, Math.ceil(y + radius))
  for (let row = minY; row <= maxY; row++) {
    for (let column = minX; column <= maxX; column++) {
      if ((column - x) ** 2 + (row - y) ** 2 > radius ** 2) continue
      const index = row * width + column
      if (strokes[index] === value) continue
      if (!edit.previous.has(index)) edit.previous.set(index, strokes[index])
      strokes[index] = value
    }
  }
}

/** Trả lớp nét cọ về trước nét `edit`. */
export function undoStroke(strokes: Uint8Array, edit: StrokeEdit): void {
  for (const [index, value] of edit.previous) strokes[index] = value
}

/** Thêm nét vào lịch sử; nét không đổi điểm nào thì bỏ, quá trần thì bỏ nét cũ nhất. */
export function pushStroke(history: StrokeEdit[], edit: StrokeEdit, limit = STROKE_HISTORY_LIMIT): StrokeEdit[] {
  if (!edit.previous.size) return history
  const next = [...history, edit]
  return next.length > limit ? next.slice(next.length - limit) : next
}
