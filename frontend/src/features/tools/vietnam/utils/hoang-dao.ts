const BRANCHES = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']
const SPIRITS = ['Thanh Long', 'Minh Đường', 'Thiên Hình', 'Chu Tước', 'Kim Quỹ', 'Kim Đường', 'Bạch Hổ', 'Ngọc Đường', 'Thiên Lao', 'Huyền Vũ', 'Tư Mệnh', 'Câu Trận']
const GOOD_SPIRITS = new Set(['Thanh Long', 'Minh Đường', 'Kim Quỹ', 'Kim Đường', 'Ngọc Đường', 'Tư Mệnh'])
// Chi khởi Thanh Long theo tháng âm 1..6 (7..12 lặp lại): "Dần Thân gia Tý, Mão Dậu Dần, Thìn Tuất tầm Thìn, Tỵ Hợi Ngọ, Tý Ngọ lâm Thân, Sửu Mùi Tuất".
const THANH_LONG_START = [0, 2, 4, 6, 8, 10]

export interface DaySpirit { name: string; good: boolean }
export interface GoodHour { branch: string; from: string; to: string }

const dayBranch = (julianDay: number) => (julianDay + 1) % 12
const spiritAt = (startKey: number, branch: number): DaySpirit => {
  const name = SPIRITS[(branch - THANH_LONG_START[startKey % 6] + 12) % 12]
  return { name, good: GOOD_SPIRITS.has(name) }
}
const hour = (value: number) => `${String(value).padStart(2, '0')}:00`

/** Thần trực ngày theo tháng âm; tháng nhuận dùng số tháng của nó. */
export function daySpirit(lunarMonth: number, julianDay: number): DaySpirit {
  return spiritAt(lunarMonth - 1, dayBranch(julianDay))
}

/** Sáu giờ hoàng đạo trong ngày; khởi Thanh Long theo chi ngày như khởi theo tháng (Dần/Thân ứng tháng 1…). */
export function dayGoodHours(julianDay: number): GoodHour[] {
  const startKey = (dayBranch(julianDay) - 2 + 12) % 6
  return BRANCHES.flatMap((branch, index) => spiritAt(startKey, index).good
    ? [{ branch, from: hour((index * 2 + 23) % 24), to: hour((index * 2 + 1) % 24) }]
    : [])
}
