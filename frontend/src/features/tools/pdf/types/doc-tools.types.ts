/**
 * Mô hình phiên làm việc của Công cụ PDF (bản Free — docs DocTools 01/08).
 *
 * Mọi thứ sống trong RAM trình duyệt, không lưu, không gửi đi. Trang được định
 * danh bằng `PageRef.id` chứ KHÔNG bằng số thứ tự: chèn/xoá/kéo làm số trang
 * đổi liên tục, lấy số trang làm khoá là chọn nhầm trang ngay lần thao tác thứ
 * hai (spec 14 — "không dùng page number làm khóa").
 */

import type { ToolErrorCode } from '@/features/tools/hub'
import type { Compression } from '../utils/compression'
import type { FormSummary } from './form.types'
import type { MarkupOutput } from '../utils/markup-annotation'
import type { Markup } from './markup.types'

export const SOURCE_KIND = {
  pdf: 'pdf',
  image: 'image',
  collage: 'collage',
} as const

export type SourceKind = (typeof SOURCE_KIND)[keyof typeof SOURCE_KIND]

export type ImageMime = 'image/jpeg' | 'image/png'

export type Rotation = 0 | 90 | 180 | 270

interface SourceBase {
  id: string
  name: string
  size: number
  pageCount: number
  /** Nhãn nguồn thay cho tên tệp — trang cắt ra vẫn phải nói nó từ trang nào của tệp nào. */
  label?: string
  /** Tệp người dùng thả vào mà nguồn này dẫn xuất ra (cắt, điền form, chỉnh nghiêng, gộp ảnh); thiếu = chính nó. */
  originId?: string
}

/** Một tệp người dùng đã thả vào (hoặc trang đã cắt) — byte không bao giờ bị sửa. */
export interface PdfSource extends SourceBase {
  kind: 'pdf'
  mime: 'application/pdf'
  bytes: Uint8Array<ArrayBuffer>
  /** Thiếu = tệp không có form. */
  form?: FormSummary
}

export interface ImageSource extends SourceBase {
  kind: 'image'
  mime: ImageMime
  bytes: Uint8Array<ArrayBuffer>
}

export interface CollagePart {
  source: ImageSource
  /** Xoay của trang ảnh lúc gộp — ảnh chụp điện thoại thường phải xoay trước rồi mới gộp. */
  rotation: Rotation
}

/**
 * Nhiều ảnh trên một trang: không có byte riêng, chỉ trỏ tới ảnh gốc — đổi khổ
 * giấy sau khi gộp vẫn dàn lại được, xuất PDF vẫn nhúng ảnh gốc không nén lại.
 */
export interface CollageSource extends SourceBase {
  kind: 'collage'
  parts: CollagePart[]
  pageCount: 1
}

export type SourceFile = PdfSource | ImageSource | CollageSource

/** Trang ảnh / trang gộp ảnh — đặt lên tờ giấy theo `ImageSheet` thay vì mang khổ riêng. */
export type SheetSource = ImageSource | CollageSource

/** Tệp gốc của một nguồn — xử lý hàng loạt gom trang theo tệp người dùng đã thả vào. */
export function originOf(source: SourceFile): string {
  return source.originId ?? source.id
}

export function isSheetSource(source: SourceFile): source is SheetSource {
  return source.kind !== 'pdf'
}

export const PAPER = {
  a4: 'a4',
  a3: 'a3',
  letter: 'letter',
  fit: 'fit',
} as const

export type Paper = (typeof PAPER)[keyof typeof PAPER]

/** Khổ giấy + lề (mm) của trang ảnh. */
export interface ImageSheet {
  paper: Paper
  margin: number
}

/** Một trang trong tài liệu đang dựng — trỏ về trang `pageIndex` (đếm từ 0) của tệp nguồn. */
export interface PageRef {
  id: string
  sourceId: string
  pageIndex: number
  /** Xoay THÊM so với trang gốc, theo chiều kim đồng hồ. */
  rotation: Rotation
  /** Đánh dấu tay — đi theo trang khi dời, nhân bản; thay trang thì mất (trang mới, nội dung khác). */
  markups?: Markup[]
  /** Chỉ trang ảnh. Thiếu = A4 không lề — hành vi trước khi có tuỳ chọn khổ giấy. */
  sheet?: ImageSheet
}

export type InsertPosition = 'before' | 'after'

/** Tệp bị từ chối khi nạp, kèm lý do để báo lại cho người dùng. */
export interface RejectedFile {
  name: string
  code: ToolErrorCode
  reason: string
}

export const IMAGE_FORMAT = {
  jpeg: 'jpeg',
  png: 'png',
} as const

export type ImageFormat = (typeof IMAGE_FORMAT)[keyof typeof IMAGE_FORMAT]

/** Tuỳ chọn cho tệp PDF (tải và tách). Xuất ảnh không dùng: ảnh luôn chụp từ bản in phẳng, không nén. */
export interface PdfOutput {
  compression: Compression
  markupOutput: MarkupOutput
}

export const DEFAULT_PDF_OUTPUT: PdfOutput = { compression: 'none', markupOutput: 'flat' }
