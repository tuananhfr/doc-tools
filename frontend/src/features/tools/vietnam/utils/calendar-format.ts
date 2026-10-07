import type { CalendarDate } from './lunar-calendar'
import { dateTimeFormat } from '@/i18n/intl'

export const todayInVietnam = () => new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10)
export const parseYmd = (value: string): CalendarDate => { const [year, month, day] = value.split('-').map(Number); return { day, month, year } }
export const toYmd = (value: CalendarDate) => `${value.year}-${String(value.month).padStart(2, '0')}-${String(value.day).padStart(2, '0')}`
export const formatDmy = (value: CalendarDate) =>
  dateTimeFormat({ day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(value.year, value.month - 1, value.day)))
export const daysBetween = (from: CalendarDate, to: CalendarDate) => Math.round((Date.UTC(to.year, to.month - 1, to.day) - Date.UTC(from.year, from.month - 1, from.day)) / 86400000)

/** "Thứ Ba, 6/10/2026" — đọc theo UTC để không lệch ngày ở múi giờ khác. */
export function formatWeekdayDate(date: string): string {
  const text = dateTimeFormat({ weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
  return text.charAt(0).toUpperCase() + text.slice(1)
}
