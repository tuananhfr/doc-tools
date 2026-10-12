/**
 * Chuyển tệp sang công cụ khác ("Sửa tiếp", "Làm ảnh thẻ từ ảnh này"…). Tệp chỉ sống trong RAM
 * của tab nên không đi qua URL hay `history.state` được (state của router bị tuần tự hoá) — giữ
 * tạm ở đây cho tới khi màn đích mount và lấy đi.
 *
 * `target` là `ToolScreen` của màn nhận; kiểu để `string` vì `shared` không import feature nào,
 * kể cả hub — nơi gọi tự giới hạn kiểu.
 */
export const HANDOFF_TTL_MS = 60_000

let pending: { target: string; files: File[]; at: number } | null = null

export function handOff(target: string, files: readonly File[], now = Date.now()): void {
  pending = { target, files: [...files], at: now }
}

/**
 * Lấy MỘT lần: F5 hay mở lại màn đích lần sau không nạp lại tệp cũ. Màn khác hỏi thì không lấy
 * (tệp vẫn chờ đúng màn). Quá hạn thì bỏ: người dùng bấm "Ở lại" ở hộp hỏi rời trang rồi làm việc
 * khác, mấy phút sau tự mở màn đích không được thấy ảnh lạ hiện ra.
 */
export function takeHandoff(screen: string, now = Date.now()): File[] {
  if (!pending) return []
  if (now - pending.at > HANDOFF_TTL_MS) {
    pending = null
    return []
  }
  if (pending.target !== screen) return []
  const { files } = pending
  pending = null
  return files
}
