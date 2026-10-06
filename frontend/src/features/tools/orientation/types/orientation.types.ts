/** Toạ độ theo ĐIỂM ẢNH của ảnh nguồn (gốc trên-trái, y hướng xuống). */
export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

/** Một mũi tên trên ảnh: đi từ `from` tới `to`, hướng là chiều `to`. */
export interface Axis {
  from: Point
  to: Point
}

/** Hướng Bắc tham chiếu — ba loại KHÔNG đổi lẫn cho nhau (spec v1.1 §7). */
export type NorthReference = 'TRUE' | 'MAGNETIC' | 'PROJECT'

/** Nguồn của số đo. `SURVEY` để sẵn cho số liệu đo đạc nhập tay của chuyên môn. */
export type OrientationSource = 'DEVICE' | 'MANUAL' | 'DRAWING' | 'SURVEY'

export type TargetType =
  | 'HOUSE_FRONTAGE'
  | 'MAIN_DOOR'
  | 'BALCONY'
  | 'KITCHEN'
  | 'ALTAR'
  | 'BED'
  | 'DESK'
  | 'LAND_FRONTAGE'
  | 'CUSTOM'

export interface OrientationTarget {
  id: string
  type: TargetType
  /** Tên tự đặt — chỉ dùng cho `CUSTOM`. */
  label?: string
  /** Trục trên ảnh; null = chưa đặt (hoặc không có ảnh). */
  axis: Axis | null
  /** Không ảnh: số độ đã chốt của riêng đối tượng này — không có trục để suy số từ một mốc chung. */
  known?: number
}

/**
 * Cách biết hướng Bắc.
 * - `DRAWING`: người dùng đặt mũi tên Bắc lên bản vẽ.
 * - `MANUAL` / `DEVICE` / `SURVEY`: một số độ đã biết của MỘT đối tượng (`targetId`).
 *   Đối tượng đó có trục trên ảnh thì suy ra được hướng Bắc trên ảnh, từ đó tính
 *   các đối tượng khác.
 */
export type Anchor =
  | { source: 'DRAWING'; northAxis: Axis }
  | { source: 'MANUAL' | 'DEVICE' | 'SURVEY'; azimuth: number; targetId: string; accuracy: number | null }

export type Divisions = 8 | 16

export type UxMode = 'HOMEOWNER' | 'PROFESSIONAL'

/** La bàn vẽ đè lên ảnh: tâm theo toạ độ ảnh, bán kính theo tỉ lệ cạnh ngắn của ảnh. */
export interface CompassLayout {
  center: Point
  /** Bán kính / cạnh ngắn của ảnh, 0.08–0.5. */
  radius: number
  opacity: number
}
