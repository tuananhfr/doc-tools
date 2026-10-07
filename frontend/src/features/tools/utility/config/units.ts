import type { ParseKeys } from 'i18next'

/** Nhãn trong cấu hình là khoá i18n: hằng nạp từ lúc import, khi đó chưa dịch được. */
type UtilityKey = ParseKeys<'utility'>

export type UnitGroupId = 'length' | 'area' | 'mass'

export interface UnitDef {
  id: string
  /** Tên đầy đủ trong ô chọn: "Mét". */
  label: UtilityKey
  /** Ký hiệu in cạnh con số: "m". */
  symbol: UtilityKey
  /** Một đơn vị này bằng bao nhiêu đơn vị gốc của nhóm (m, m², kg). */
  factor: number
}

export interface UnitGroup {
  id: UnitGroupId
  label: UtilityKey
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
    label: 'unitConvert.groups.length',
    icon: 'rulers',
    from: 'm',
    to: 'mm',
    units: [
      { id: 'mm', label: 'unitConvert.units.mm.name', symbol: 'unitConvert.units.mm.symbol', factor: 0.001 },
      { id: 'cm', label: 'unitConvert.units.cm.name', symbol: 'unitConvert.units.cm.symbol', factor: 0.01 },
      { id: 'm', label: 'unitConvert.units.m.name', symbol: 'unitConvert.units.m.symbol', factor: 1 },
      { id: 'km', label: 'unitConvert.units.km.name', symbol: 'unitConvert.units.km.symbol', factor: 1000 },
      { id: 'in', label: 'unitConvert.units.in.name', symbol: 'unitConvert.units.in.symbol', factor: 0.0254 },
      { id: 'ft', label: 'unitConvert.units.ft.name', symbol: 'unitConvert.units.ft.symbol', factor: 0.3048 },
      { id: 'yd', label: 'unitConvert.units.yd.name', symbol: 'unitConvert.units.yd.symbol', factor: 0.9144 },
      { id: 'mi', label: 'unitConvert.units.mi.name', symbol: 'unitConvert.units.mi.symbol', factor: 1609.344 },
    ],
  },
  {
    id: 'area',
    label: 'unitConvert.groups.area',
    icon: 'bounding-box',
    from: 'm2',
    to: 'ha',
    units: [
      { id: 'mm2', label: 'unitConvert.units.mm2.name', symbol: 'unitConvert.units.mm2.symbol', factor: 0.000001 },
      { id: 'cm2', label: 'unitConvert.units.cm2.name', symbol: 'unitConvert.units.cm2.symbol', factor: 0.0001 },
      { id: 'm2', label: 'unitConvert.units.m2.name', symbol: 'unitConvert.units.m2.symbol', factor: 1 },
      { id: 'ha', label: 'unitConvert.units.ha.name', symbol: 'unitConvert.units.ha.symbol', factor: 10_000 },
      { id: 'km2', label: 'unitConvert.units.km2.name', symbol: 'unitConvert.units.km2.symbol', factor: 1_000_000 },
      { id: 'ft2', label: 'unitConvert.units.ft2.name', symbol: 'unitConvert.units.ft2.symbol', factor: 0.09290304 },
      { id: 'ac', label: 'unitConvert.units.ac.name', symbol: 'unitConvert.units.ac.symbol', factor: 4046.8564224 },
    ],
  },
  {
    id: 'mass',
    label: 'unitConvert.groups.mass',
    icon: 'box-seam',
    from: 'kg',
    to: 't',
    units: [
      { id: 'g', label: 'unitConvert.units.g.name', symbol: 'unitConvert.units.g.symbol', factor: 0.001 },
      { id: 'kg', label: 'unitConvert.units.kg.name', symbol: 'unitConvert.units.kg.symbol', factor: 1 },
      { id: 'yen', label: 'unitConvert.units.yen.name', symbol: 'unitConvert.units.yen.symbol', factor: 10 },
      { id: 'ta', label: 'unitConvert.units.ta.name', symbol: 'unitConvert.units.ta.symbol', factor: 100 },
      { id: 't', label: 'unitConvert.units.t.name', symbol: 'unitConvert.units.t.symbol', factor: 1000 },
      { id: 'oz', label: 'unitConvert.units.oz.name', symbol: 'unitConvert.units.oz.symbol', factor: 0.028349523125 },
      { id: 'lb', label: 'unitConvert.units.lb.name', symbol: 'unitConvert.units.lb.symbol', factor: 0.45359237 },
    ],
  },
]
