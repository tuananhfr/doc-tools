/**
 * Gợi ý "Thêm công cụ này vào màn hình chính" — nhớ TRÊN MÁY NÀY ai đã tắt, không gửi đi đâu.
 * ×: không nhắc lại cho công cụ đó · "Không nhắc lại": tắt cho mọi công cụ.
 */
export const TOOL_INSTALL_HINT_KEY = 'cn.toolInstallHint'

export interface ToolInstallHintPrefs {
  never: boolean
  closed: string[]
}

const CLOSED_LIMIT = 200

/** Dữ liệu trong localStorage có thể do bản cũ hoặc tay người ghi — không tin kiểu của nó. */
export function parseHintPrefs(raw: string | null): ToolInstallHintPrefs {
  try {
    const value: unknown = raw ? JSON.parse(raw) : null
    if (!value || typeof value !== 'object') return { never: false, closed: [] }
    const { never, closed } = value as Record<string, unknown>
    return {
      never: never === true,
      closed: Array.isArray(closed) ? closed.filter((item): item is string => typeof item === 'string').slice(-CLOSED_LIMIT) : [],
    }
  } catch {
    return { never: false, closed: [] }
  }
}

export function closeHint(prefs: ToolInstallHintPrefs, slug: string): ToolInstallHintPrefs {
  return { ...prefs, closed: [...prefs.closed.filter(item => item !== slug), slug].slice(-CLOSED_LIMIT) }
}

export type HintMode = 'prompt' | 'ios' | null

/**
 * `prompt`: trình duyệt có hộp cài một chạm (Chrome, Edge, Samsung Internet) cho manifest của công cụ.
 * `ios`: Safari trên iPhone/iPad — không có hộp cài, chỉ hướng dẫn Chia sẻ → Thêm vào MH chính.
 * Không gợi ý khi: đang chạy dạng ứng dụng, trang nằm trong khung của site khác, hoặc đã tắt.
 */
export function hintMode(input: { slug: string; prefs: ToolInstallHintPrefs; promptReady: boolean; standalone: boolean; framed: boolean; ios: boolean }): HintMode {
  if (input.standalone || input.framed || input.prefs.never || input.prefs.closed.includes(input.slug)) return null
  if (input.promptReady) return 'prompt'
  return input.ios ? 'ios' : null
}
