import type { ElementId } from '../utils/terms'

/**
 * Hành của 30 nạp âm trong lục thập hoa giáp: mỗi mục ứng với hai năm liền nhau, bắt đầu từ Giáp Tý.
 * Tên nạp âm ở `orientation:terms.napAm.<chỉ số>`.
 */
export const NAP_AM_ELEMENTS: ElementId[] = [
  'METAL', 'FIRE', 'WOOD', 'EARTH', 'METAL', 'FIRE',
  'WATER', 'EARTH', 'METAL', 'WOOD', 'WATER', 'EARTH',
  'FIRE', 'WOOD', 'WATER', 'METAL', 'FIRE', 'WOOD',
  'EARTH', 'METAL', 'FIRE', 'WATER', 'EARTH', 'METAL',
  'WOOD', 'WATER', 'EARTH', 'FIRE', 'WOOD', 'WATER',
]
