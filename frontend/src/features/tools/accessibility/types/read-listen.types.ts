/**
 * Tám mã lỗi của Đọc & Nghe (spec v3 §06) — mã ổn định để hỗ trợ và kiểm thử bám vào; câu báo ở
 * `accessibility:readAloud.errors.<mã>` và luôn kèm đường lui "dán văn bản".
 */
export const READ_ERROR_CODES = ['PAYWALL', 'ROBOTS_DENIED', 'UNSUPPORTED', 'NO_ARTICLE', 'TTS_UNAVAILABLE', 'OCR_UNCERTAIN', 'OFFLINE', 'TOO_LARGE'] as const

export type ReadErrorCode = (typeof READ_ERROR_CODES)[number]

export type ReadSourceKind = 'text' | 'file' | 'link'

/** Một nguồn để đọc: chữ dán, tệp, hoặc (WP4-B) bài từ link. Chỉ sống trong RAM của tab. */
export interface ReadSource {
  kind: ReadSourceKind
  /** Tên tệp / tiêu đề bài; rỗng với chữ dán. */
  title: string
  text: string
  /** Chỉ có với `link`. */
  sourceUrl?: string
  warnings: ReadErrorCode[]
}

/** Mỗi thẻ nhập ứng với một loại nguồn. */
export type ReadInputTab = ReadSourceKind

export type ReadEngine = 'device' | 'piper'

export type ReadFontScale = 'normal' | 'large' | 'xlarge'

/** Khoảng trong văn bản gốc (đầu tính, cuối không tính). */
export interface ReadRange {
  start: number
  end: number
}
