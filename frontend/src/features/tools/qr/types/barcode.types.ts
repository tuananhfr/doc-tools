/** Loại mã vạch 1D tạo được. GS1 (EAN, ITF-14) có số kiểm tra; Code 128 / Code 39 dùng nội bộ. */
export type BarcodeKind = 'ean13' | 'ean8' | 'itf14' | 'code128' | 'code39'

export type BarcodeFileType = 'png' | 'svg' | 'pdf'

/**
 * Kết quả kiểm một giá trị trước khi vẽ. `value` là chuỗi ĐẦY ĐỦ sẽ nằm trong mã
 * (đã thêm số kiểm tra nếu thiếu); `notes` nói rõ mọi chỗ công cụ đã tự đổi.
 */
export type BarcodeCheck = { ok: true; value: string; notes: string[] } | { ok: false; reason: string }

export interface BarcodeRow {
  /** Số dòng trong tệp (đếm từ 1) — để người dùng tìm lại dòng lỗi. */
  line: number
  raw: string
  check: BarcodeCheck
}
