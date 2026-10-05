import type { Rgb } from '../utils/decorations'
import type { FontStyle } from '../utils/font-style'
import type { Point, QuarterTurn } from '../utils/page-geometry'

/**
 * Đánh dấu tay trên trang (spec 01 — F-MARKUP, bản Free): chỉ vẽ phẳng vào nội
 * dung trang khi XUẤT, không phải annotation PDF sửa lại được.
 *
 * Toạ độ tính bằng pt trong KHUNG GỐC của trang: khung đã áp `/Rotate` của tệp
 * nguồn nhưng CHƯA áp xoay thêm của người dùng. Xoay trang sau khi đánh dấu thì
 * dấu xoay theo nội dung — lưu theo khung đang nhìn là dấu lệch khỏi chỗ đã vẽ.
 */

export const MARKUP_TOOL = {
  select: 'select',
  pen: 'pen',
  line: 'line',
  arrow: 'arrow',
  rect: 'rect',
  ellipse: 'ellipse',
  cloud: 'cloud',
  highlight: 'highlight',
  underline: 'underline',
  strikeout: 'strikeout',
  editText: 'editText',
  cover: 'cover',
  redact: 'redact',
  text: 'text',
  note: 'note',
  stamp: 'stamp',
} as const

export type MarkupTool = (typeof MARKUP_TOOL)[keyof typeof MARKUP_TOOL]

export const MARKUP_COLOR = {
  red: 'red',
  orange: 'orange',
  yellow: 'yellow',
  green: 'green',
  blue: 'blue',
  black: 'black',
} as const

export type MarkupColor = (typeof MARKUP_COLOR)[keyof typeof MARKUP_COLOR]

/** Độ dày nét (pt) — cũng quyết cỡ chữ của công cụ Chữ. */
export const STROKE_WIDTH = { thin: 1, medium: 2, thick: 4 } as const

export type StrokeWidth = (typeof STROKE_WIDTH)[keyof typeof STROKE_WIDTH]

export const STAMP_PRESET = {
  approved: 'approved',
  rejected: 'rejected',
  checked: 'checked',
  revise: 'revise',
  draft: 'draft',
} as const

export type StampPreset = (typeof STAMP_PRESET)[keyof typeof STAMP_PRESET]

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/**
 * Khung có hướng: `origin` là góc trên-trái NHƯ NGƯỜI DÙNG THẤY lúc tạo, `turn`
 * là xoay thêm của trang lúc đó. Nhờ vậy chữ gõ trên trang đã xoay vẫn đứng
 * thẳng như lúc gõ; `width`/`height` đo theo chiều chữ, không theo khung gốc.
 */
export interface OrientedBox {
  origin: Point
  turn: QuarterTurn
  width: number
  height: number
}

/**
 * Khung chữ đã được kéo giãn: `wrap` là bề rộng ngắt dòng (pt, không gồm lề
 * ghi chú), `lines` là các dòng đã ngắt sẵn lúc kéo/gõ — vẽ và xuất khỏi phải
 * đo lại. Không có = khung ôm vừa chữ, chỉ xuống dòng ở chỗ người gõ Enter.
 */
interface TextWrap {
  wrap?: number
  lines?: string[]
}

interface MarkupBase {
  id: string
  color: MarkupColor
}

export type Markup =
  | (MarkupBase & { kind: 'pen'; width: StrokeWidth; points: Point[] })
  | (MarkupBase & { kind: 'line' | 'arrow'; width: StrokeWidth; from: Point; to: Point })
  | (MarkupBase & { kind: 'rect' | 'ellipse' | 'cloud'; width: StrokeWidth; box: Rect })
  | (MarkupBase & { kind: 'highlight'; box: Rect })
  | (MarkupBase & { kind: 'underline' | 'strikeout'; width: StrokeWidth; frame: OrientedBox })
  | (MarkupBase & { kind: 'text'; fontSize: number; text: string; frame: OrientedBox } & TextWrap)
  | (MarkupBase & { kind: 'note'; text: string; frame: OrientedBox } & TextWrap)
  | { id: string; kind: 'stamp'; preset: StampPreset; date: string; frame: OrientedBox }
  | RedactMarkup
  | TextEditMarkup

/**
 * Xoá thật: khác "che chữ" ở chỗ nội dung dưới khung BỊ XOÁ khỏi tệp xuất —
 * trang có khung này được dựng lại thành ảnh, lớp chữ chỉ giữ phần ngoài khung.
 */
export interface RedactMarkup {
  id: string
  kind: 'redact'
  box: Rect
}

/**
 * Sửa chữ / che chữ: phủ nền lên chữ gốc rồi (nếu có) viết chữ mới. CHỈ trên
 * bề mặt — chữ gốc vẫn nằm trong tệp, sao chép hay tìm vẫn ra.
 */
export interface TextEditMarkup {
  id: string
  kind: 'textEdit'
  /** Khung theo chiều chữ gốc (`turn` = góc chữ); `width` là bề rộng ngắt dòng, kéo giãn được. */
  frame: OrientedBox
  /** Vùng chữ gốc phải che — cùng gốc và hướng với `frame`, không đổi khi kéo giãn. */
  cover: { width: number; height: number }
  /** Rỗng = chỉ che. */
  text: string
  /** Đã ngắt dòng theo `frame.width` lúc sửa — lúc xuất khỏi phải đo lại. */
  lines: string[]
  fontSize: number
  /** Từ mép trên khung tới chân chữ dòng đầu (pt). */
  baseline: number
  /** Lề trái/phải của chữ trong khung (pt). */
  inset: number
  font: FontStyle
  ink: Rgb
  fill: Rgb
}

export type MarkupKind = Markup['kind']
