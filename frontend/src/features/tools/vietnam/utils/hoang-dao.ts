import { translateKey } from '@/i18n/runtime'

const SPIRITS = ['THANH_LONG', 'MINH_DUONG', 'THIEN_HINH', 'CHU_TUOC', 'KIM_QUY', 'KIM_DUONG', 'BACH_HO', 'NGOC_DUONG', 'THIEN_LAO', 'HUYEN_VU', 'TU_MENH', 'CAU_TRAN']
const GOOD_SPIRITS = new Set(['THANH_LONG', 'MINH_DUONG', 'KIM_QUY', 'KIM_DUONG', 'NGOC_DUONG', 'TU_MENH'])
// Chi khởi Thanh Long theo tháng âm 1..6 (7..12 lặp lại): "Dần Thân gia Tý, Mão Dậu Dần, Thìn Tuất tầm Thìn, Tỵ Hợi Ngọ, Tý Ngọ lâm Thân, Sửu Mùi Tuất".
const THANH_LONG_START = [0, 2, 4, 6, 8, 10]

export interface DaySpirit { name: string; good: boolean }
export interface GoodHour { branch: string; from: string; to: string }

const dayBranch = (julianDay: number) => (julianDay + 1) % 12
const spiritAt = (startKey: number, branch: number): DaySpirit => {
  const id = SPIRITS[(branch - THANH_LONG_START[startKey % 6] + 12) % 12]
  return { name: translateKey(`vietnam:terms.spirits.${id}`), good: GOOD_SPIRITS.has(id) }
}
const hour = (value: number) => `${String(value).padStart(2, '0')}:00`

/** Thần trực ngày theo tháng âm; tháng nhuận dùng số tháng của nó. */
export function daySpirit(lunarMonth: number, julianDay: number): DaySpirit {
  return spiritAt(lunarMonth - 1, dayBranch(julianDay))
}

/** Sáu giờ hoàng đạo trong ngày; khởi Thanh Long theo chi ngày như khởi theo tháng (Dần/Thân ứng tháng 1…). */
export function dayGoodHours(julianDay: number): GoodHour[] {
  const startKey = (dayBranch(julianDay) - 2 + 12) % 6
  return Array.from({ length: 12 }, (_, index) => index).flatMap((index) => spiritAt(startKey, index).good
    ? [{ branch: translateKey(`vietnam:terms.branches.${index}`), from: hour((index * 2 + 23) % 24), to: hour((index * 2 + 1) % 24) }]
    : [])
}
