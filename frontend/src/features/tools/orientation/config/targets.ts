import type { TargetType } from '../types/orientation.types'

export interface TargetSpec {
  type: TargetType
  label: string
  /** Nhãn ngắn in cạnh kim trên la bàn. */
  short: string
  icon: string
  /** Gợi ý cho người dùng phổ thông: trục này chỉ về đâu. */
  hint: string
}

/**
 * Các đối tượng đo được (spec v1.1 §10). Mỗi đối tượng có trục riêng nhưng dùng
 * chung một mốc Bắc. Trục luôn chỉ RA phía đối tượng "nhìn" về — hướng nhà là
 * hướng nhìn từ trong nhà ra cửa, không phải hướng đứng ngoài nhìn vào.
 */
export const TARGET_SPECS: TargetSpec[] = [
  { type: 'HOUSE_FRONTAGE', label: 'Hướng nhà', short: 'Nhà', icon: 'house-door', hint: 'Từ trong nhà nhìn thẳng ra mặt tiền' },
  { type: 'MAIN_DOOR', label: 'Cửa chính', short: 'Cửa', icon: 'door-open', hint: 'Từ trong nhà nhìn ra qua cửa chính' },
  { type: 'BALCONY', label: 'Ban công', short: 'Ban công', icon: 'building', hint: 'Từ trong phòng nhìn ra ban công' },
  // Hướng bếp = hướng lưng người đứng nấu (mặt bếp nhìn ra), KHÔNG phải hướng người nấu nhìn vào.
  { type: 'KITCHEN', label: 'Bếp', short: 'Bếp', icon: 'fire', hint: 'Hướng lưng người đứng nấu — ngược hướng người nấu nhìn vào bếp' },
  { type: 'ALTAR', label: 'Bàn thờ', short: 'Bàn thờ', icon: 'brightness-alt-high', hint: 'Hướng mặt bàn thờ nhìn ra' },
  { type: 'BED', label: 'Giường', short: 'Giường', icon: 'moon-stars', hint: 'Từ đầu giường nhìn về cuối giường' },
  { type: 'DESK', label: 'Bàn làm việc', short: 'Bàn', icon: 'laptop', hint: 'Hướng người ngồi làm việc nhìn tới' },
  { type: 'LAND_FRONTAGE', label: 'Mặt tiền đất', short: 'Đất', icon: 'signpost-split', hint: 'Từ trong lô đất nhìn ra đường' },
  { type: 'CUSTOM', label: 'Đối tượng khác', short: 'Khác', icon: 'bullseye', hint: 'Tự đặt tên, trục chỉ về hướng cần đo' },
]

export function targetSpec(type: TargetType): TargetSpec {
  return TARGET_SPECS.find((spec) => spec.type === type) ?? TARGET_SPECS[TARGET_SPECS.length - 1]
}
