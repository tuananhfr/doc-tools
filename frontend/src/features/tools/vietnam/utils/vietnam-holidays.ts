import { translateKey } from '@/i18n/runtime'
import { lunarToSolar, solarToLunar, type CalendarDate } from './lunar-calendar'

export type HolidayLayer = 'major' | 'lunar' | 'moon' | 'memorial'
export interface Holiday { id: string; date: string; name: string; short: string; layer: HolidayLayer; lunar: boolean }

/** Mã ngày lễ; tên ở `vietnam:holidays.<key>` (`name` đầy đủ, `short` cho ô lịch). */
type HolidayKey = string

export const HOLIDAY_LAYERS: { id: HolidayLayer; defaultOn: boolean }[] = [
  { id: 'major', defaultOn: true },
  { id: 'lunar', defaultOn: true },
  { id: 'moon', defaultOn: true },
  { id: 'memorial', defaultOn: false },
]

// `short` là tên hiện trong ô lịch (ô chỉ rộng khoảng 70px trên desktop); tên đầy đủ hiện ở panel ngày.
interface FixedRule { month: number; day: number; key: HolidayKey; layer: HolidayLayer; fromYear?: number }

// Chỉ ghi tên ngày. Số ngày được nghỉ là dữ liệu pháp lý (Thủ tướng chốt lịch nghỉ Tết từng năm,
// 2/9 nghỉ thêm một ngày liền kề) nên không suy ra ở đây.
const SOLAR: FixedRule[] = [
  { month: 1, day: 1, key: 'NEW_YEAR', layer: 'major' },
  { month: 4, day: 30, key: 'REUNIFICATION', layer: 'major' },
  { month: 5, day: 1, key: 'LABOUR', layer: 'major' },
  { month: 9, day: 2, key: 'NATIONAL_DAY', layer: 'major' },
  // Nghị quyết 28/2026/QH16, hiệu lực 01/07/2026: năm trước đó chưa phải ngày lễ.
  { month: 11, day: 24, key: 'CULTURE', layer: 'major', fromYear: 2026 },
  { month: 2, day: 3, key: 'PARTY', layer: 'memorial' },
  { month: 2, day: 14, key: 'VALENTINE', layer: 'memorial' },
  { month: 2, day: 27, key: 'PHYSICIANS', layer: 'memorial' },
  { month: 3, day: 8, key: 'WOMEN_INTL', layer: 'memorial' },
  { month: 3, day: 26, key: 'YOUTH_UNION', layer: 'memorial' },
  { month: 5, day: 7, key: 'DIEN_BIEN_PHU', layer: 'memorial' },
  { month: 5, day: 19, key: 'HO_CHI_MINH', layer: 'memorial' },
  { month: 6, day: 1, key: 'CHILDREN', layer: 'memorial' },
  { month: 6, day: 28, key: 'FAMILY', layer: 'memorial' },
  { month: 7, day: 27, key: 'MARTYRS', layer: 'memorial' },
  { month: 8, day: 19, key: 'AUGUST_REVOLUTION', layer: 'memorial' },
  { month: 10, day: 10, key: 'CAPITAL', layer: 'memorial' },
  { month: 10, day: 20, key: 'WOMEN_VN', layer: 'memorial' },
  { month: 11, day: 20, key: 'TEACHERS', layer: 'memorial' },
  { month: 12, day: 22, key: 'ARMY', layer: 'memorial' },
  { month: 12, day: 24, key: 'CHRISTMAS_EVE', layer: 'memorial' },
  { month: 12, day: 25, key: 'CHRISTMAS', layer: 'memorial' },
]

const LUNAR: FixedRule[] = [
  { month: 1, day: 1, key: 'TET_1', layer: 'major' },
  { month: 1, day: 2, key: 'TET_2', layer: 'major' },
  { month: 1, day: 3, key: 'TET_3', layer: 'major' },
  { month: 3, day: 10, key: 'HUNG_KINGS', layer: 'major' },
  { month: 1, day: 15, key: 'LANTERN', layer: 'lunar' },
  { month: 3, day: 3, key: 'COLD_FOOD', layer: 'lunar' },
  { month: 4, day: 15, key: 'VESAK', layer: 'lunar' },
  { month: 5, day: 5, key: 'DOAN_NGO', layer: 'lunar' },
  { month: 7, day: 15, key: 'VU_LAN', layer: 'lunar' },
  { month: 8, day: 15, key: 'MID_AUTUMN', layer: 'lunar' },
  { month: 12, day: 23, key: 'KITCHEN_GODS', layer: 'lunar' },
]

// Lịch dài hơn khoảng này là gọi nhầm; chặn để không lặp hàng nghìn lần đổi âm lịch.
export const MAX_RANGE_DAYS = 400
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
  const add = (date: CalendarDate | null, key: HolidayKey, layer: HolidayLayer, lunar: boolean) => {
    if (date) {
      result.push({
        id: `${layer}:${iso(date)}:${key}`,
        date: iso(date),
        name: translateKey(`vietnam:holidays.${key}.name`),
        short: translateKey(`vietnam:holidays.${key}.short`),
        layer,
        lunar,
      })
    }
  }
  for (const rule of SOLAR) if (!rule.fromYear || year >= rule.fromYear) add({ year, month: rule.month, day: rule.day }, rule.key, rule.layer, false)
  add(nthSunday(year, 5, 2), 'MOTHER', 'memorial', false)
  add(nthSunday(year, 6, 3), 'FATHER', 'memorial', false)
  // Lễ âm lịch theo năm âm `year`; tháng Chạp có thể rơi sang tháng 1-2 dương của năm sau.
  for (const rule of LUNAR) add(lunarToSolar({ year, month: rule.month, day: rule.day }), rule.key, rule.layer, true)
  // Giao thừa là ngày cuối tháng Chạp (29 hoặc 30), nên lùi một ngày từ mùng 1 Tết năm sau.
  const nextTet = lunarToSolar({ year: year + 1, month: 1, day: 1 })
  if (nextTet) add(fromUtc(toUtc(iso(nextTet)) - DAY_MS), 'NEW_YEAR_EVE', 'major', true)
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
    const name = translateKey(`vietnam:holidays.moon.${lunar.day === 1 ? 'first' : 'full'}${lunar.leap ? 'Leap' : ''}`, { month: lunar.month })
    result.push({ id: `moon:${iso(date)}`, date: iso(date), name, short: name, layer: 'moon', lunar: true })
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || HOLIDAY_LAYERS.findIndex((layer) => layer.id === a.layer) - HOLIDAY_LAYERS.findIndex((layer) => layer.id === b.layer))
}
