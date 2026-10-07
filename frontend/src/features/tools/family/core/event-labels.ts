import { dateTimeFormat } from '@/i18n/intl'

/** "Thứ Ba, 6/10/2026" — `date` là YYYY-MM-DD, đọc theo UTC để không lệch ngày ở múi giờ khác. */
export function formatDayHeading(date: string): string {
  const text = dateTimeFormat({ weekday: 'long', day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date}T00:00:00Z`))
  return text.charAt(0).toUpperCase() + text.slice(1)
}
