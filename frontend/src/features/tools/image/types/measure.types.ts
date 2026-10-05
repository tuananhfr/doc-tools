import type { Point } from './image.types'

export type LengthUnit = 'mm' | 'cm' | 'm'

/** `reference` = đang đặt đoạn chuẩn; ba kiểu còn lại là ba thẻ của công cụ. */
export type MeasureMode = 'distance' | 'area' | 'count' | 'reference'

export type MeasureShape =
  | { id: number; kind: 'distance'; points: [Point, Point] }
  /** Đa giác khép kín, từ 3 đỉnh. */
  | { id: number; kind: 'area'; points: Point[] }
  | { id: number; kind: 'count'; points: [Point] }

/** Đoạn có chiều dài thật đã biết, dùng để quy điểm ảnh ra đơn vị đo. */
export interface MeasureReference {
  points: [Point, Point]
  /** null = đã đặt đoạn nhưng chưa nhập chiều dài thật. */
  length: number | null
  unit: LengthUnit
}

export interface MeasureState {
  mode: MeasureMode
  shapes: MeasureShape[]
  /** Các điểm đã bấm của hình đang vẽ dở. */
  draft: Point[]
  reference: MeasureReference | null
  /** Số thứ tự cấp cho hình kế tiếp — reducer thuần nên không tự sinh id ngẫu nhiên. */
  nextId: number
}

/** Hệ số quy đổi: mỗi điểm ảnh ứng với bao nhiêu `unit`. */
export interface MeasureScale {
  perPixel: number
  unit: LengthUnit
}
