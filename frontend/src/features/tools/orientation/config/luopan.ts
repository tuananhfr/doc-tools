import type { LuopanConvention, Mountain } from '../types/luopan.types'

/** 24 sơn theo chiều kim đồng hồ, bắt đầu từ Tý (tâm 0°); mỗi sơn rộng 15°. */
const NAMES = [
  'Tý', 'Quý', 'Sửu', 'Cấn', 'Dần', 'Giáp', 'Mão', 'Ất', 'Thìn', 'Tốn', 'Tỵ', 'Bính',
  'Ngọ', 'Đinh', 'Mùi', 'Khôn', 'Thân', 'Canh', 'Dậu', 'Tân', 'Tuất', 'Càn', 'Hợi', 'Nhâm',
]

export const MOUNTAIN_WIDTH = 15

export const MOUNTAINS: Mountain[] = NAMES.map((name, index) => {
  const center = index * MOUNTAIN_WIDTH
  // Mỗi hướng gồm 3 sơn; Nhâm (345°) quay về hướng Bắc.
  return { index, name, center, sector: Math.floor(((center + 22.5) % 360) / 45) }
})

/** Tám quái hậu thiên theo chỉ số hướng (0 = Bắc) — vòng quái trên mặt la kinh. */
export const TRIGRAM_BY_SECTOR = ['Khảm', 'Cấn', 'Chấn', 'Tốn', 'Ly', 'Khôn', 'Đoài', 'Càn']

/**
 * Vùng không vong: các nguồn phong thuỷ không thống nhất độ rộng — ±1,5° quanh ranh
 * là mức hay gặp nhất. Đây là quy ước tham khảo, đổi độ rộng thì tăng `version`.
 */
export const LUOPAN_CONVENTION: LuopanConvention = {
  version: '1.0.0',
  voidWindow: 1.5,
  note: 'Không vong là quy ước tham khảo của phong thuỷ dân gian: hướng nằm sát ranh hai hướng (đại không vong) hoặc hai sơn (tiểu không vong) trong khoảng ±1,5°.',
}
