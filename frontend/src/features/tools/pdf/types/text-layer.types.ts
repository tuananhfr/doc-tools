import type { Point } from '../utils/page-geometry'
import type { OcrPageResult } from './ocr-result.types'

/**
 * Lớp chữ của một trang PDF — mảnh chữ pdf.js đọc được, đã đổi sang KHUNG GỐC
 * (pt, gốc trên-trái, đã áp CropBox + `/Rotate` của tệp nguồn) như mọi dấu
 * khác. Trang ảnh, bản scan không có lớp chữ: `runs` rỗng.
 */
export interface TextRun {
  /** Đã chuẩn hoá NFC — PDF xuất từ macOS hay mang chữ có dấu dạng tổ hợp (NFD). */
  text: string
  /** Đầu đường chân chữ. */
  origin: Point
  /** Độ, ngược chiều kim đồng hồ. */
  angle: number
  /** Cỡ chữ (pt). */
  size: number
  /** Bề dài dọc đường chân chữ (pt). */
  width: number
  /** Phần trên / dưới đường chân chữ, tính theo cỡ chữ. */
  ascent: number
  descent: number
  /** Tên font pdf.js nội bộ (`g_d0_f1`) — khoá tra kiểu chữ khi sửa chữ. */
  fontName: string
  /** Họ chung pdf.js đoán: `sans-serif` / `serif` / `monospace`. */
  fontFamily: string
  /** Mảnh cuối dòng. */
  eol: boolean
}

export interface PageText {
  runs: TextRun[]
  ocr?: OcrPageResult
}

/** Tứ giác trong khung gốc (4 đỉnh theo chiều chữ: trên-trái, trên-phải, dưới-phải, dưới-trái). */
export type Quad = [Point, Point, Point, Point]
