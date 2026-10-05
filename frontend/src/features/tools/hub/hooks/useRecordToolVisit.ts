import { useEffect } from 'react'
import { recordVisit } from '../services/tool-visits.service'

const KEY_PREFIX = 'erpcons.tools.visit.'
/** Cùng một tab mở lại cùng công cụ trong 10 phút (F5, quay lại) không cộng thêm. */
const REPEAT_WINDOW_MS = 10 * 60 * 1000

/** sessionStorage có thể bị chặn (chế độ riêng tư): đọc không được thì cứ đếm. */
function claimVisit(slug: string, now: number): boolean {
  try {
    const last = Number(sessionStorage.getItem(KEY_PREFIX + slug))
    if (last && now - last < REPEAT_WINDOW_MS) return false
    sessionStorage.setItem(KEY_PREFIX + slug, String(now))
  } catch {
    // vẫn đếm
  }
  return true
}

/**
 * Cộng một lượt mở công cụ lên máy chủ. Chạy ngầm: lỗi mạng hay máy chủ chưa bật
 * `erp_tools` đều không được làm phiền người đang dùng công cụ.
 *
 * Mốc giờ ghi TRƯỚC khi gửi nên StrictMode (effect chạy hai lần) chỉ gửi một lần.
 */
export function useRecordToolVisit(slug: string | null) {
  useEffect(() => {
    if (!slug || !claimVisit(slug, Date.now())) return
    recordVisit(slug).catch(() => undefined)
  }, [slug])
}
