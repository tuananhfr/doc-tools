import { lunarToSolar, solarToLunar, type CalendarDate } from '@/features/tools/vietnam'

export type HolidayLayer = 'major' | 'lunar' | 'moon' | 'memorial'
export interface Holiday { id: string; date: string; name: string; short: string; layer: HolidayLayer; lunar: boolean }

export const HOLIDAY_LAYERS: { id: HolidayLayer; label: string; defaultOn: boolean }[] = [
  { id: 'major', label: 'Lễ lớn', defaultOn: true },
  { id: 'lunar', label: 'Lễ truyền thống', defaultOn: true },
  { id: 'moon', label: 'Mùng 1 & Rằm', defaultOn: true },
  { id: 'memorial', label: 'Ngày kỷ niệm', defaultOn: false },
]

// `short` là tên hiện trong ô lịch (ô chỉ rộng khoảng 70px trên desktop); tên đầy đủ hiện ở panel ngày.
interface FixedRule { month: number; day: number; name: string; short?: string; layer: HolidayLayer; fromYear?: number }

// Chỉ ghi tên ngày. Số ngày được nghỉ là dữ liệu pháp lý (Thủ tướng chốt lịch nghỉ Tết từng năm,
// 2/9 nghỉ thêm một ngày liền kề) nên không suy ra ở đây.
const SOLAR: FixedRule[] = [
  { month: 1, day: 1, name: 'Tết Dương lịch', layer: 'major' },
  { month: 4, day: 30, name: 'Ngày Giải phóng miền Nam', short: 'Giải phóng miền Nam', layer: 'major' },
  { month: 5, day: 1, name: 'Ngày Quốc tế Lao động', short: 'Quốc tế Lao động', layer: 'major' },
  { month: 9, day: 2, name: 'Quốc khánh', layer: 'major' },
  // Nghị quyết 28/2026/QH16, hiệu lực 01/07/2026: năm trước đó chưa phải ngày lễ.
  { month: 11, day: 24, name: 'Ngày Văn hóa Việt Nam', short: 'Ngày Văn hóa', layer: 'major', fromYear: 2026 },
  { month: 2, day: 3, name: 'Ngày thành lập Đảng', short: 'Thành lập Đảng', layer: 'memorial' },
  { month: 2, day: 14, name: 'Lễ Tình nhân', layer: 'memorial' },
  { month: 2, day: 27, name: 'Ngày Thầy thuốc Việt Nam', short: 'Thầy thuốc VN', layer: 'memorial' },
  { month: 3, day: 8, name: 'Quốc tế Phụ nữ', layer: 'memorial' },
  { month: 3, day: 26, name: 'Ngày thành lập Đoàn', short: 'Thành lập Đoàn', layer: 'memorial' },
  { month: 5, day: 7, name: 'Chiến thắng Điện Biên Phủ', short: 'Điện Biên Phủ', layer: 'memorial' },
  { month: 5, day: 19, name: 'Ngày sinh Chủ tịch Hồ Chí Minh', short: 'Sinh nhật Bác', layer: 'memorial' },
  { month: 6, day: 1, name: 'Quốc tế Thiếu nhi', layer: 'memorial' },
  { month: 6, day: 28, name: 'Ngày Gia đình Việt Nam', short: 'Gia đình VN', layer: 'memorial' },
  { month: 7, day: 27, name: 'Ngày Thương binh Liệt sĩ', short: 'Thương binh Liệt sĩ', layer: 'memorial' },
  { month: 8, day: 19, name: 'Cách mạng Tháng Tám', layer: 'memorial' },
  { month: 10, day: 10, name: 'Ngày Giải phóng Thủ đô', short: 'Giải phóng Thủ đô', layer: 'memorial' },
  { month: 10, day: 20, name: 'Ngày Phụ nữ Việt Nam', short: 'Phụ nữ VN', layer: 'memorial' },
  { month: 11, day: 20, name: 'Ngày Nhà giáo Việt Nam', short: 'Nhà giáo VN', layer: 'memorial' },
  { month: 12, day: 22, name: 'Ngày thành lập Quân đội nhân dân', short: 'Quân đội ND', layer: 'memorial' },
  { month: 12, day: 24, name: 'Đêm Giáng sinh', layer: 'memorial' },
  { month: 12, day: 25, name: 'Lễ Giáng sinh', layer: 'memorial' },
]

const LUNAR: FixedRule[] = [
  { month: 1, day: 1, name: 'Tết Nguyên đán (mùng 1)', short: 'Mùng 1 Tết', layer: 'major' },
  { month: 1, day: 2, name: 'Tết Nguyên đán (mùng 2)', short: 'Mùng 2 Tết', layer: 'major' },
  { month: 1, day: 3, name: 'Tết Nguyên đán (mùng 3)', short: 'Mùng 3 Tết', layer: 'major' },
  { month: 3, day: 10, name: 'Giỗ Tổ Hùng Vương', short: 'Giỗ Tổ', layer: 'major' },
  { month: 1, day: 15, name: 'Rằm tháng Giêng', layer: 'lunar' },
  { month: 3, day: 3, name: 'Tết Hàn thực', layer: 'lunar' },
  { month: 4, day: 15, name: 'Lễ Phật đản', layer: 'lunar' },
  { month: 5, day: 5, name: 'Tết Đoan ngọ', layer: 'lunar' },
  { month: 7, day: 15, name: 'Lễ Vu lan', layer: 'lunar' },
  { month: 8, day: 15, name: 'Tết Trung thu', layer: 'lunar' },
  { month: 12, day: 23, name: 'Ông Công Ông Táo', short: 'Ông Táo', layer: 'lunar' },
]

// Lịch dài hơn khoảng này là gọi nhầm; chặn để không lặp hàng nghìn lần đổi âm lịch.
const MAX_RANGE_DAYS = 400
const DAY_MS = 86400000

const iso = (date: CalendarDate) => `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`
const toUtc = (value: string) => { const [year, month, day] = value.split('-').map(Number); return Date.UTC(year, month - 1, day) }
const fromUtc = (timestamp: number): CalendarDate => { const date = new Date(timestamp); return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() } }

function nthSunday(year: number, month: number, nth: number): CalendarDate {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  return { year, month, day: 1 + ((7 - firstWeekday) % 7) + (nth - 1) * 7 }
}

function holidaysOfYear(year: number): Holiday[] {
  const result: Holiday[] = []
  const add = (date: CalendarDate | null, name: string, layer: HolidayLayer, lunar: boolean, short = name) => {
    if (date) result.push({ id: `${layer}:${iso(date)}:${name}`, date: iso(date), name, short, layer, lunar })
  }
  for (const rule of SOLAR) if (!rule.fromYear || year >= rule.fromYear) add({ year, month: rule.month, day: rule.day }, rule.name, rule.layer, false, rule.short)
  add(nthSunday(year, 5, 2), 'Ngày của Mẹ', 'memorial', false)
  add(nthSunday(year, 6, 3), 'Ngày của Cha', 'memorial', false)
  // Lễ âm lịch theo năm âm `year`; tháng Chạp có thể rơi sang tháng 1-2 dương của năm sau.
  for (const rule of LUNAR) add(lunarToSolar({ year, month: rule.month, day: rule.day }), rule.name, rule.layer, true, rule.short)
  // Giao thừa là ngày cuối tháng Chạp (29 hoặc 30), nên lùi một ngày từ mùng 1 Tết năm sau.
  const nextTet = lunarToSolar({ year: year + 1, month: 1, day: 1 })
  if (nextTet) add(fromUtc(toUtc(iso(nextTet)) - DAY_MS), 'Giao thừa', 'major', true)
  return result
}

/** Ngày lễ trong khoảng [from, to] (YYYY-MM-DD, tính cả hai đầu), sắp theo ngày. */
export function holidaysInRange(from: string, to: string): Holiday[] {
  const start = toUtc(from)
  const end = toUtc(to)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || (end - start) / DAY_MS > MAX_RANGE_DAYS) return []
  const firstYear = fromUtc(start).year
  const lastYear = fromUtc(end).year
  const result: Holiday[] = []
  for (let year = firstYear - 1; year <= lastYear; year += 1) {
    for (const holiday of holidaysOfYear(year)) {
      const at = toUtc(holiday.date)
      if (at >= start && at <= end) result.push(holiday)
    }
  }
  const named = new Set(result.filter((holiday) => holiday.lunar).map((holiday) => holiday.date))
  for (let at = start; at <= end; at += DAY_MS) {
    const date = fromUtc(at)
    const lunar = solarToLunar(date)
    if (!lunar || (lunar.day !== 1 && lunar.day !== 15) || named.has(iso(date))) continue
    const monthName = `tháng ${lunar.month}${lunar.leap ? ' nhuận' : ''}`
    const name = lunar.day === 1 ? `Mùng 1 ${monthName}` : `Rằm ${monthName}`
    result.push({ id: `moon:${iso(date)}`, date: iso(date), name, short: name, layer: 'moon', lunar: true })
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || HOLIDAY_LAYERS.findIndex((layer) => layer.id === a.layer) - HOLIDAY_LAYERS.findIndex((layer) => layer.id === b.layer))
}
