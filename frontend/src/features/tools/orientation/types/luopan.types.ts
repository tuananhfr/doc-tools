/** Một trong 24 sơn: 15° quanh `center`, thuộc một trong 8 hướng. */
export interface Mountain {
  index: number
  /** Tâm sơn, độ so với Bắc theo chiều kim đồng hồ (Tý = 0°). */
  center: number
  /** Chỉ số 8 hướng chứa sơn này, 0 = Bắc. */
  sector: number
}

/** Đại không vong = sát ranh hai quái (hai hướng); tiểu không vong = sát ranh hai sơn trong một quái. */
export type VoidKind = 'MAJOR' | 'MINOR'

export interface MountainReading {
  mountain: Mountain
  /** Độ lệch so với tâm sơn, [-7,5; 7,5); dương = lệch theo chiều kim đồng hồ. */
  offset: number
  /** Sơn kề phía đang lệch về; null khi đúng tâm. */
  toward: Mountain | null
  void: VoidKind | null
}

/** Quy ước đọc la bàn — dữ liệu có phiên bản như bộ luật theo tuổi. */
export interface LuopanConvention {
  version: string
  /** Nửa độ rộng vùng không vong quanh mỗi ranh sơn, độ. */
  voidWindow: number
}
