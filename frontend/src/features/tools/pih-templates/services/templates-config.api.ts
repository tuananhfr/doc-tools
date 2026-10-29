import { withBase } from '@/utils/url'

// Không gửi cookie / referrer, giống read-extract.api.ts: chỉ hỏi một cờ bật/tắt công khai.
const REQUEST: RequestInit = { cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' }

/**
 * Cờ `templates.piholding.enabled` của máy chủ (mặc định tắt). Lỗi mạng / phản hồi lạ = tắt:
 * nút "Mẫu để thử" chỉ hiện khi chắc chắn bật, giống `fetchReadLinkEnabled`.
 */
export async function fetchPihTemplatesEnabled(signal?: AbortSignal): Promise<boolean> {
  try {
    const response = await fetch(withBase('/api/v1/templates/config'), { ...REQUEST, signal })
    if (!response.ok) return false
    const value = await response.json() as { ok?: unknown; enabled?: unknown }
    return value.ok === true && value.enabled === true
  } catch {
    return false
  }
}
