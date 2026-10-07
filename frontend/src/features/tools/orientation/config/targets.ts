import type { TargetType } from '../types/orientation.types'

/** Tên, tên ngắn (in cạnh kim la bàn) và gợi ý nằm ở `orientation:targets.<type>`. */
export interface TargetSpec {
  type: TargetType
  icon: string
}

/**
 * Các đối tượng đo được (spec v1.1 §10). Mỗi đối tượng có trục riêng nhưng dùng
 * chung một mốc Bắc. Trục luôn chỉ RA phía đối tượng "nhìn" về — hướng nhà là
 * hướng nhìn từ trong nhà ra cửa, không phải hướng đứng ngoài nhìn vào.
 */
export const TARGET_SPECS: TargetSpec[] = [
  { type: 'HOUSE_FRONTAGE', icon: 'house-door' },
  { type: 'MAIN_DOOR', icon: 'door-open' },
  { type: 'BALCONY', icon: 'building' },
  // Hướng bếp = hướng lưng người đứng nấu (mặt bếp nhìn ra), KHÔNG phải hướng người nấu nhìn vào.
  { type: 'KITCHEN', icon: 'fire' },
  { type: 'ALTAR', icon: 'brightness-alt-high' },
  { type: 'BED', icon: 'moon-stars' },
  { type: 'DESK', icon: 'laptop' },
  { type: 'LAND_FRONTAGE', icon: 'signpost-split' },
  { type: 'CUSTOM', icon: 'bullseye' },
]

export function targetSpec(type: TargetType): TargetSpec {
  return TARGET_SPECS.find((spec) => spec.type === type) ?? TARGET_SPECS[TARGET_SPECS.length - 1]
}
