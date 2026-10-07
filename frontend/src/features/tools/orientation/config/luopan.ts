import type { LuopanConvention, Mountain } from '../types/luopan.types'
import type { TrigramId } from '../utils/terms'

export const MOUNTAIN_WIDTH = 15

/** 24 sơn theo chiều kim đồng hồ, bắt đầu từ Tý (tâm 0°); tên ở `orientation:terms.mountains.<index>`. */
export const MOUNTAINS: Mountain[] = Array.from({ length: 360 / MOUNTAIN_WIDTH }, (_, index) => {
  const center = index * MOUNTAIN_WIDTH
  // Mỗi hướng gồm 3 sơn; Nhâm (345°) quay về hướng Bắc.
  return { index, center, sector: Math.floor(((center + 22.5) % 360) / 45) }
})

/** Tám quái hậu thiên theo chỉ số hướng (0 = Bắc) — vòng quái trên mặt la kinh. */
export const TRIGRAM_BY_SECTOR: TrigramId[] = ['KAN', 'GEN', 'ZHEN', 'XUN', 'LI', 'KUN', 'DUI', 'QIAN']

/**
 * Vùng không vong: các nguồn phong thuỷ không thống nhất độ rộng — ±1,5° quanh ranh
 * là mức hay gặp nhất. Đây là quy ước tham khảo, đổi độ rộng thì tăng `version`.
 */
export const LUOPAN_CONVENTION: LuopanConvention = {
  version: '1.0.0',
  voidWindow: 1.5,
}
