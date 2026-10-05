import type { UnitDef, UnitGroup } from '../config/units'

/**
 * Đổi một giá trị giữa hai đơn vị CÙNG nhóm. Kết quả còn đuôi nhiễu của số thực
 * (1 ft = 12,000000000000002 in) — in ra bằng `formatQuantity`, hàm đó gọt đuôi.
 */
export function convertUnit(value: number, from: UnitDef, to: UnitDef): number {
  return (value * from.factor) / to.factor
}

export function findUnit(group: UnitGroup, id: string): UnitDef {
  return group.units.find((unit) => unit.id === id) ?? group.units[0]
}

/** Cùng một giá trị ở MỌI đơn vị của nhóm, theo thứ tự khai báo. */
export function convertToAll(value: number, from: UnitDef, group: UnitGroup): { unit: UnitDef; value: number }[] {
  return group.units.map((unit) => ({ unit, value: convertUnit(value, from, unit) }))
}
