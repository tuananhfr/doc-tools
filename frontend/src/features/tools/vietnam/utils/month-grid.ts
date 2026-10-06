import { solarToLunar } from './lunar-calendar'

export interface MonthCell { date: string; day: number; inMonth: boolean; weekday: number; lunarDay: number; lunarMonth: number; lunarLeap: boolean }

const pad = (value: number) => String(value).padStart(2, '0')

/** Lưới 6 tuần x 7 ngày, tuần bắt đầu Thứ Hai như lịch treo tường Việt Nam. */
export function buildMonthGrid(year: number, month: number): MonthCell[] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
  const leading = (firstWeekday + 6) % 7
  const start = Date.UTC(year, month - 1, 1 - leading)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start + index * 86400000)
    const solar = { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
    const lunar = solarToLunar(solar)
    return {
      date: `${solar.year}-${pad(solar.month)}-${pad(solar.day)}`,
      day: solar.day,
      inMonth: solar.month === month,
      weekday: date.getUTCDay(),
      lunarDay: lunar?.day ?? 0,
      lunarMonth: lunar?.month ?? 0,
      lunarLeap: lunar?.leap ?? false,
    }
  })
}

export function shiftMonth(year: number, month: number, offset: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + offset
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}
