export type UnitGroupId = 'length' | 'area' | 'mass'

export interface UnitDef {
  id: string
  /** Tên đầy đủ trong ô chọn: "Mét". */
  label: string
  /** Ký hiệu in cạnh con số: "m". */
  symbol: string
  /** Một đơn vị này bằng bao nhiêu đơn vị gốc của nhóm (m, m², kg). */
  factor: number
}

export interface UnitGroup {
  id: UnitGroupId
  label: string
  icon: string
  /** Cặp đơn vị hiện sẵn khi mở nhóm. */
  from: string
  to: string
  units: UnitDef[]
}

/**
 * Hệ số là định nghĩa CHÍNH XÁC (inch = 25,4 mm; pound = 0,45359237 kg), không
 * phải số làm tròn. Không có sào / mẫu / công: mỗi vùng một cỡ, đổi ra là sai
 * với hai phần ba người dùng.
 */
export const UNIT_GROUPS: UnitGroup[] = [
  {
    id: 'length',
    label: 'Chiều dài',
    icon: 'rulers',
    from: 'm',
    to: 'mm',
    units: [
      { id: 'mm', label: 'Milimét', symbol: 'mm', factor: 0.001 },
      { id: 'cm', label: 'Xentimét', symbol: 'cm', factor: 0.01 },
      { id: 'm', label: 'Mét', symbol: 'm', factor: 1 },
      { id: 'km', label: 'Kilômét', symbol: 'km', factor: 1000 },
      { id: 'in', label: 'Inch', symbol: 'in', factor: 0.0254 },
      { id: 'ft', label: 'Foot (feet)', symbol: 'ft', factor: 0.3048 },
      { id: 'yd', label: 'Yard', symbol: 'yd', factor: 0.9144 },
      { id: 'mi', label: 'Dặm Anh', symbol: 'mi', factor: 1609.344 },
    ],
  },
  {
    id: 'area',
    label: 'Diện tích',
    icon: 'bounding-box',
    from: 'm2',
    to: 'ha',
    units: [
      { id: 'mm2', label: 'Milimét vuông', symbol: 'mm²', factor: 0.000001 },
      { id: 'cm2', label: 'Xentimét vuông', symbol: 'cm²', factor: 0.0001 },
      { id: 'm2', label: 'Mét vuông', symbol: 'm²', factor: 1 },
      { id: 'ha', label: 'Héc-ta', symbol: 'ha', factor: 10_000 },
      { id: 'km2', label: 'Kilômét vuông', symbol: 'km²', factor: 1_000_000 },
      { id: 'ft2', label: 'Foot vuông', symbol: 'ft²', factor: 0.09290304 },
      { id: 'ac', label: 'Mẫu Anh (acre)', symbol: 'ac', factor: 4046.8564224 },
    ],
  },
  {
    id: 'mass',
    label: 'Khối lượng',
    icon: 'box-seam',
    from: 'kg',
    to: 't',
    units: [
      { id: 'g', label: 'Gam', symbol: 'g', factor: 0.001 },
      { id: 'kg', label: 'Kilôgam', symbol: 'kg', factor: 1 },
      { id: 'yen', label: 'Yến', symbol: 'yến', factor: 10 },
      { id: 'ta', label: 'Tạ', symbol: 'tạ', factor: 100 },
      { id: 't', label: 'Tấn', symbol: 'tấn', factor: 1000 },
      { id: 'oz', label: 'Ounce', symbol: 'oz', factor: 0.028349523125 },
      { id: 'lb', label: 'Pound', symbol: 'lb', factor: 0.45359237 },
    ],
  },
]
