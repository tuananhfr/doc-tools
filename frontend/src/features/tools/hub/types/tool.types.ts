/**
 * Danh mục công cụ của "Chuyện Nhỏ" — bộ tiện ích miễn phí chạy trong trình
 * duyệt. Hub chỉ biết TÊN và ĐƯỜNG DẪN của công cụ; màn của từng công cụ do
 * tầng route gắn vào theo `screen` (`routes/tools.routes.tsx`), nên hub không
 * import feature nào khác.
 */

/**
 * Nhóm theo VIỆC người dùng cần làm, không theo loại tệp: PDF nằm trong `document`.
 * `money` · `date` · `home` · `tech` khai sẵn cho công cụ sắp làm — nhóm chưa có
 * công cụ nào thì không có chip lọc (`TOOL_FILTERS`).
 */
export const TOOL_CATEGORY = {
  document: 'document',
  image: 'image',
  calc: 'calc',
  money: 'money',
  date: 'date',
  data: 'data',
  construction: 'construction',
  home: 'home',
  tech: 'tech',
  other: 'other',
} as const

export type ToolCategory = (typeof TOOL_CATEGORY)[keyof typeof TOOL_CATEGORY]

/** `all` là bộ lọc, không phải nhóm của công cụ. */
export type ToolFilter = ToolCategory | 'all'

/** Tên token màu của ô icon — CSS đổi sang `--erp-<tone>` + bản `-soft`. */
export type ToolTone = 'info' | 'construction' | 'success' | 'intelligence' | 'neutral' | 'warning'

export const TOOL_STATUS = {
  ready: 'ready',
  soon: 'soon',
} as const

export type ToolStatus = (typeof TOOL_STATUS)[keyof typeof TOOL_STATUS]

/**
 * Việc xử lý diễn ra ở đâu (Registry, spec v2.0 §4 `processing_mode`). Mọi công
 * cụ ĐÃ LÀM chạy trong trình duyệt; `browser-model` = có nạp thêm một mô hình
 * nhận dạng chạy cục bộ (tesseract) — vẫn không gửi tệp đi, không LLM.
 * `server` chỉ dành cho công cụ "Sắp có" cần dữ liệu máy chủ (quy hoạch, giá…),
 * để trang "Cách xử lý dữ liệu" nói trước điều đó.
 */
export type ToolProcessing = 'browser' | 'browser-model' | 'server'

/**
 * Màn thật của một công cụ đã dùng được. `editor` = trình chỉnh sửa PDF đầy đủ;
 * nhóm PDF / ảnh chạy theo luồng chọn tệp → chạy → kết quả; nhóm cuối là tiện
 * ích không nhận tệp (`ToolBoard`).
 */
export type ToolScreen =
  | 'editor'
  | 'merge-pdf'
  | 'split-pdf'
  | 'compress-pdf'
  | 'convert-file'
  | 'pdf-to-image'
  | 'organize-pdf'
  | 'page-numbers'
  | 'stamp-pdf'
  | 'redact-pdf'
  | 'sign-pdf'
  | 'compare-pdf'
  | 'ocr'
  | 'image-to-text'
  | 'images-to-pdf'
  | 'convert-image'
  | 'compress-image'
  | 'crop-image'
  | 'batch-image'
  | 'mark-image'
  | 'id-photo'
  | 'measure-image'
  | 'qr-create'
  | 'qr-read'
  | 'barcode-create'
  | 'quick-calc'
  | 'money-calc'
  | 'date-calc'
  | 'unit-convert'
  | 'char-count'
  | 'color'
  | 'random-code'
  | 'quick-note'
  | 'house-orientation'
  | 'number-words'
  | 'loan'
  | 'unit-price'
  | 'study'
  | 'pomodoro'
  | 'group-split'
  | 'legacy-font'
  | 'read-aloud'
  | 'vietqr'
  | 'invoice-xml'
  | 'remove-metadata'
  | 'collage'
  | 'message-risk'
  | 'flashcards'
  | 'house-estimate'
  | 'dictation'
  | 'magnifier'
  | 'form-templates'
  | 'electricity'
  | 'lunar-calendar'
  | 'payroll'
  | 'address-conversion'
  | 'family-calendar'
  | 'pdf-password'
  | 'cv'
  | 'remove-background'
  | 'idea-suggestion'
  | 'regulation-feedback'
  | 'assistant'
  | 'compress-video'
  | 'trim-video'
  | 'video-gif'
  | 'extract-audio'

interface ToolBase {
  id: string
  /** Không dấu, đúng chữ người Việt gõ tìm — đổi slug là gãy mọi link đã phát ra. */
  slug: string
  name: string
  description: string
  icon: string
  /** Nhóm đầu tiên quyết định màu ô icon. */
  categories: [ToolCategory, ...ToolCategory[]]
  /** Tiêu đề tab trình duyệt; thiếu = `<name> miễn phí`. */
  pageTitle?: string
  /** Công cụ không nhận tệp: dòng cam kết đầu trang nói về DỮ LIỆU thay vì về tệp. */
  noFile?: boolean
  /** Privacy statement for a tool that uses a browser-provided remote service. */
  privacyNote?: string
  /** Thiếu = `browser`. */
  processing?: ToolProcessing
  /** Thứ hạng ở lưới "Hay dùng" (nhỏ đứng trước); thiếu = chỉ hiện khi xem tất cả. */
  priority?: number
  /** Từ người dùng hay gõ tìm mà tên và mô tả không có. Chỉ ghi việc công cụ LÀM ĐƯỢC hôm nay. */
  synonyms?: string[]
}

export interface ReadyTool extends ToolBase {
  status: 'ready'
  screen: ToolScreen
}

export interface SoonTool extends ToolBase {
  status: 'soon'
}

export type ToolDefinition = ReadyTool | SoonTool
