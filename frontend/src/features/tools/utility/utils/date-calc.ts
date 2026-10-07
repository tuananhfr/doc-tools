/**
 * Phép tính trên NGÀY LỊCH (không giờ, không múi giờ). Mỗi ngày là một số
 * nguyên đếm từ 01/01/1970 theo UTC — cộng trừ trên `Date` địa phương là dính
 * giờ mùa hè: một "ngày" có thể dài 23 hoặc 25 tiếng và phép chia cho 86.400.000
 * ra lệch một ngày.
 */

import { translate } from '@/i18n/runtime'

const DAY_MS = 86_400_000

/** `'2026-10-03'` → số ngày; `null` khi chuỗi không phải một ngày có thật (30/02). */
export function toDay(ymd: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) return null
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])]
  const time = Date.UTC(year, month - 1, date)
  const back = new Date(time)
  if (back.getUTCFullYear() !== year || back.getUTCMonth() !== month - 1 || back.getUTCDate() !== date) return null
  return time / DAY_MS
}

export function fromDay(day: number): string {
  return new Date(day * DAY_MS).toISOString().slice(0, 10)
}

/** Hôm nay theo đồng hồ của MÁY người dùng (không phải UTC: 6 giờ sáng ở Việt Nam vẫn là hôm qua theo UTC). */
export function todayYmd(now: Date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** 0 = Chủ nhật … 6 = Thứ Bảy. Ngày 0 (01/01/1970) là Thứ Năm. */
export function weekdayOf(day: number): number {
  return (((day + 4) % 7) + 7) % 7
}

export function isWeekend(day: number): boolean {
  const weekday = weekdayOf(day)
  return weekday === 0 || weekday === 6
}

const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const

/** "Thứ Bảy, 03/10/2026". */
export function formatDay(day: number): string {
  const [year, month, date] = fromDay(day).split('-')
  return `${translate(`utility:weekdays.${WEEKDAY_KEYS[weekdayOf(day)]}`)}, ${date}/${month}/${year}`
}

/** Số ngày T2–T6 trong đoạn [first, last] (cả hai đầu); rỗng khi last < first. */
function weekdaysIn(first: number, last: number): number {
  if (last < first) return 0
  const total = last - first + 1
  let count = Math.floor(total / 7) * 5
  for (let day = first + Math.floor(total / 7) * 7; day <= last; day++) if (!isWeekend(day)) count++
  return count
}

export interface DaySpan {
  /** Số ngày lịch; âm khi ngày kết thúc đứng trước ngày bắt đầu. */
  days: number
  /** Chỉ loại Thứ Bảy và Chủ nhật — KHÔNG biết ngày lễ. */
  workdays: number
  weekendDays: number
}

/**
 * Khoảng cách giữa hai ngày. Mặc định KHÔNG tính ngày bắt đầu ("từ thứ Hai đến
 * thứ Sáu là 4 ngày" — cách đếm thời hạn); `includeStart` đếm cả hai đầu ("làm
 * từ thứ Hai đến thứ Sáu là 5 ngày").
 */
export function spanBetween(from: number, to: number, includeStart: boolean): DaySpan {
  const sign = to >= from ? 1 : -1
  // Ngày bị loại luôn là ngày BẮT ĐẦU, kể cả khi đếm ngược (nó là đầu lớn của đoạn).
  const skip = includeStart ? 0 : 1
  const [first, last] = sign > 0 ? [from + skip, to] : [to, from - skip]
  const days = last - first + 1
  const workdays = weekdaysIn(first, last)
  // `+ 0` gọt `-0` của phép nhân với dấu âm.
  return { days: sign * days + 0, workdays: sign * workdays + 0, weekendDays: sign * (days - workdays) + 0 }
}

/**
 * Lùi / tiến `count` ngày LÀM VIỆC (T2–T6). `count = 0` trả về chính ngày bắt
 * đầu, kể cả khi nó rơi vào cuối tuần — không tự đẩy sang thứ Hai, vì người
 * dùng chưa xin cộng ngày nào.
 */
export function addWorkdays(start: number, count: number): number {
  const step = count >= 0 ? 1 : -1
  let left = Math.abs(count)
  if (left === 0) return start
  let day = start
  // Đứng ở cuối tuần thì lùi về ngày làm việc liền TRƯỚC hướng đi: cùng một kết
  // quả, mà phép nhảy trọn tuần bên dưới chỉ đúng khi xuất phát từ T2–T6.
  while (isWeekend(day)) day -= step
  // 5 ngày làm việc = 7 ngày lịch.
  day += step * Math.floor(left / 5) * 7
  left %= 5
  while (left > 0) {
    day += step
    if (!isWeekend(day)) left--
  }
  return day
}

/** "3 tuần 2 ngày" — cách người ta nói về một khoảng thời gian dài hơn một tuần. */
export function weeksLabel(days: number): string | null {
  const total = Math.abs(days)
  if (total < 7) return null
  const weeks = Math.floor(total / 7)
  const rest = total % 7
  return rest === 0 ? translate('utility:duration.weeks', { count: weeks }) : translate('utility:duration.weeksDays', { weeks: translate('utility:duration.weeks', { count: weeks }), days: translate('utility:duration.days', { count: rest }) })
}
