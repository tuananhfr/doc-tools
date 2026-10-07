import type { Size } from '../types/image.types'

/** Cỡ ảnh thẻ, tính bằng MILIMÉT. */
export interface PhotoSize extends Size {
  id: string
  label: string
}

/**
 * Chỉ ghi KÍCH THƯỚC, không ghi "dùng cho giấy tờ nào": quy định ảnh của từng
 * loại hồ sơ khác nhau theo nơi nhận và đổi theo thời gian — gắn tên giấy tờ vào
 * là công cụ khẳng định một điều nó không kiểm được.
 */
export const PHOTO_SIZES: PhotoSize[] = [
  { id: '2x3', label: '2 × 3 cm', width: 20, height: 30 },
  { id: '3x4', label: '3 × 4 cm', width: 30, height: 40 },
  { id: '35x45', label: '3,5 × 4,5 cm', width: 35, height: 45 },
  { id: '4x6', label: '4 × 6 cm', width: 40, height: 60 },
  { id: '51x51', label: '5,1 × 5,1 cm (2 × 2 inch)', width: 51, height: 51 },
]

/** Nhãn khổ giấy nằm ở `idPhoto.paper.<id>` / `idPhoto.paperName.<id>` của namespace `image`. */
export interface PaperSize extends Size {
  id: 'a4' | 'a5' | '10x15' | '13x18'
}

export const PAPER_SIZES: PaperSize[] = [
  { id: 'a4', width: 210, height: 297 },
  { id: 'a5', width: 148, height: 210 },
  { id: '10x15', width: 102, height: 152 },
  { id: '13x18', width: 127, height: 178 },
]

/** Lề giấy (mm): máy in văn phòng không in được sát mép, 5 mm là mức an toàn chung. */
export const SHEET_MARGIN = 5

/** Độ phân giải của tờ in dạng ảnh và của ảnh thẻ đơn. */
export const PRINT_DPI = 300

/** Trần độ phân giải của ảnh nhúng vào PDF: quá mức này tệp nặng thêm mà máy in không in ra được. */
export const PDF_PHOTO_DPI = 600

export const GAP_LIMIT = { min: 0, max: 20 }
