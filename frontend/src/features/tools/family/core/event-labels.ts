import type { Recurrence } from './family'

export const RECURRENCE_LABELS: Record<Recurrence, string> = { once: 'Một lần', daily: 'Hằng ngày', weekly: 'Hằng tuần', monthly: 'Hằng tháng', yearly: 'Hằng năm' }

/** "Thứ Ba, 6/10/2026" — `date` là YYYY-MM-DD, đọc theo UTC để không lệch ngày ở múi giờ khác. */
export function formatDayHeading(date: string): string {
  const text = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
  return text.charAt(0).toUpperCase() + text.slice(1)
}
