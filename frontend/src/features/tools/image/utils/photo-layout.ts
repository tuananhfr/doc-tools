import type { Point, Size } from '../types/image.types'

/** Bố cục một tờ in ảnh thẻ. Mọi số đo là MILIMÉT, gốc ở góc trên-trái tờ giấy. */
export interface SheetLayout {
  paper: Size
  photo: Size
  columns: number
  rows: number
  /** Số ảnh tối đa một tờ chứa được. */
  capacity: number
  /** Góc trên-trái của từng ảnh, theo thứ tự từ trái sang phải, trên xuống dưới. */
  cells: Point[]
}

const MM_PER_INCH = 25.4

export const mmToPx = (mm: number, dpi: number): number => Math.round((mm / MM_PER_INCH) * dpi)

/** Điểm (pt) của PDF: 1 pt = 1/72 inch. */
export const mmToPt = (mm: number): number => (mm / MM_PER_INCH) * 72

/** Số ô xếp vừa một chiều `room`, các ô cách nhau `gap`. */
const fitCount = (room: number, side: number, gap: number): number => Math.max(0, Math.floor((room + gap) / (side + gap)))

/**
 * Xếp ảnh thành lưới CĂN GIỮA tờ giấy. `copies` = null là xếp kín tờ; nhiều hơn
 * sức chứa thì chỉ xếp tới sức chứa (người gọi phải báo). Không tự xoay ảnh hay
 * giấy: xoay để nhét thêm một cột là ảnh nằm ngang trên tờ, cắt xong dễ lẫn chiều.
 */
export function layoutSheet(paper: Size, photo: Size, gap: number, margin: number, copies: number | null): SheetLayout {
  const columns = fitCount(paper.width - 2 * margin, photo.width, gap)
  const rows = fitCount(paper.height - 2 * margin, photo.height, gap)
  const capacity = columns * rows
  const count = copies === null ? capacity : Math.min(copies, capacity)

  const usedRows = columns === 0 ? 0 : Math.ceil(count / columns)
  const usedColumns = Math.min(count, columns)
  const left = (paper.width - (usedColumns * photo.width + Math.max(0, usedColumns - 1) * gap)) / 2
  const top = (paper.height - (usedRows * photo.height + Math.max(0, usedRows - 1) * gap)) / 2

  const cells: Point[] = []
  for (let index = 0; index < count; index++) {
    cells.push({ x: left + (index % columns) * (photo.width + gap), y: top + Math.floor(index / columns) * (photo.height + gap) })
  }
  return { paper: { width: paper.width, height: paper.height }, photo: { width: photo.width, height: photo.height }, columns, rows, capacity, cells }
}

/**
 * Độ phân giải thật (DPI) của ảnh thẻ khi in: số điểm ảnh của vùng đã cắt chia
 * cho kích thước in. Dưới ~200 là in ra thấy nhoè.
 */
export function printDpi(cropWidthPx: number, photoWidthMm: number): number {
  return Math.round(cropWidthPx / (photoWidthMm / MM_PER_INCH))
}

export const LOW_DPI = 200
