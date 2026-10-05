import type { Point } from '../utils/page-geometry'

/**
 * Trang trí áp khi XUẤT (spec 01 — F-PAGE-08/09): đầu/chân trang (gồm số trang)
 * và watermark chữ. Không đụng tệp nguồn; lớp phủ trên màn hình vẽ bằng cùng
 * hàm bố cục với lúc xuất để thấy gì ra nấy.
 */

export const STAMP_SLOTS = ['topLeft', 'topCenter', 'topRight', 'bottomLeft', 'bottomCenter', 'bottomRight'] as const

export type StampSlot = (typeof STAMP_SLOTS)[number]

export const SCOPE_MODE = {
  all: 'all',
  skipFirst: 'skipFirst',
  range: 'range',
} as const

export type ScopeMode = (typeof SCOPE_MODE)[keyof typeof SCOPE_MODE]

/** Trang nào được áp — tính theo thứ tự trên lưới, không theo từng tệp xuất. */
export interface PageScope {
  mode: ScopeMode
  /** Chỉ dùng khi `mode = range`, cú pháp như ô "Tách PDF" ("1-3, 5"). */
  range: string
}

export interface HeaderFooter {
  slots: Record<StampSlot, string>
  /** pt */
  fontSize: number
  /** Khoảng cách từ mép trang tới chữ, pt. */
  margin: number
  /** Số in ở trang ĐẦU của mỗi tệp xuất. */
  startNumber: number
  scope: PageScope
}

export const WATERMARK_COLOR = {
  gray: 'gray',
  red: 'red',
  blue: 'blue',
} as const

export type WatermarkColor = (typeof WATERMARK_COLOR)[keyof typeof WATERMARK_COLOR]

export interface Watermark {
  text: string
  /** pt */
  fontSize: number
  color: WatermarkColor
  /** 0–1 */
  opacity: number
  /** Độ, ngược chiều kim đồng hồ theo hướng người đọc nhìn trang. */
  angle: number
  scope: PageScope
}

export const STAMP_ANCHORS = [
  'topLeft',
  'topCenter',
  'topRight',
  'middleLeft',
  'center',
  'middleRight',
  'bottomLeft',
  'bottomCenter',
  'bottomRight',
] as const

export type StampAnchor = (typeof STAMP_ANCHORS)[number]

/** Dấu ảnh / logo — công cụ "Đóng dấu PDF" và "Chèn chữ ký" dùng, trình chỉnh sửa chưa có. */
export interface ImageStamp {
  bytes: Uint8Array<ArrayBuffer>
  mime: 'image/png' | 'image/jpeg'
  /** Cao / rộng của ảnh. */
  aspect: number
  anchor: StampAnchor
  /** Bề rộng dấu so với bề rộng trang người đọc thấy, 0–1. */
  widthRatio: number
  /** Khoảng cách từ mép trang tới dấu, pt. */
  margin: number
  /** 0–1 */
  opacity: number
  scope: PageScope
  /**
   * Đặt tự do ("Chèn chữ ký"): id trang → tâm từng dấu theo tỉ lệ trang nhìn thấy
   * (0–1). Có thì THAY cho `anchor` + `margin` + `scope`: chỉ trang có tâm mới được vẽ.
   */
  spots?: Readonly<Record<string, readonly Point[]>>
}

/** `null` = đang tắt. */
export interface Decorations {
  headerFooter: HeaderFooter | null
  watermark: Watermark | null
  imageStamp?: ImageStamp | null
}

/** Giá trị cho các trường tự điền `{n}` `{N}` `{date}` `{file}` của một trang. */
export interface StampContext {
  pageNumber: number
  lastNumber: number
  date: string
  fileName: string
}

/** Giá trị chung của cả tệp xuất cho `{file}` và `{date}`. */
export interface StampMeta {
  fileName: string
  date: string
}
