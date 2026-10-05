import { describe, expect, it } from 'vitest'
import { addWorkdays, formatDay, fromDay, isWeekend, spanBetween, toDay, todayYmd, weekdayOf, weeksLabel } from './date-calc'

const day = (ymd: string): number => {
  const value = toDay(ymd)
  if (value === null) throw new Error(`ngày sai: ${ymd}`)
  return value
}

describe('toDay / fromDay', () => {
  it('đổi qua lại không lệch', () => {
    for (const ymd of ['1970-01-01', '2024-02-29', '2026-10-03', '2026-12-31']) expect(fromDay(day(ymd))).toBe(ymd)
  })

  it('từ chối ngày không có thật và chuỗi sai dạng', () => {
    expect(toDay('2026-02-30')).toBeNull()
    expect(toDay('2025-02-29')).toBeNull()
    expect(toDay('2026-13-01')).toBeNull()
    expect(toDay('03/10/2026')).toBeNull()
    expect(toDay('')).toBeNull()
  })
})

describe('thứ trong tuần', () => {
  it('03/10/2026 là Thứ Bảy', () => {
    expect(weekdayOf(day('2026-10-03'))).toBe(6)
    expect(isWeekend(day('2026-10-03'))).toBe(true)
    expect(isWeekend(day('2026-10-05'))).toBe(false)
    expect(formatDay(day('2026-10-03'))).toBe('Thứ Bảy, 03/10/2026')
  })

  it('đúng cả với ngày trước 1970', () => {
    expect(weekdayOf(day('1969-12-31'))).toBe(3)
  })
})

describe('todayYmd', () => {
  it('lấy ngày theo đồng hồ địa phương', () => {
    expect(todayYmd(new Date(2026, 9, 3, 6, 0))).toBe('2026-10-03')
    expect(todayYmd(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05')
  })
})

describe('spanBetween', () => {
  it('thứ Hai đến thứ Sáu: 4 ngày, hoặc 5 khi tính cả ngày bắt đầu', () => {
    const [monday, friday] = [day('2026-10-05'), day('2026-10-09')]
    expect(spanBetween(monday, friday, false)).toEqual({ days: 4, workdays: 4, weekendDays: 0 })
    expect(spanBetween(monday, friday, true)).toEqual({ days: 5, workdays: 5, weekendDays: 0 })
  })

  it('qua cuối tuần thì ngày làm việc ít hơn ngày lịch', () => {
    expect(spanBetween(day('2026-10-02'), day('2026-10-05'), false)).toEqual({ days: 3, workdays: 1, weekendDays: 2 })
    expect(spanBetween(day('2026-10-01'), day('2026-10-31'), true)).toEqual({ days: 31, workdays: 22, weekendDays: 9 })
  })

  it('cùng một ngày', () => {
    expect(spanBetween(day('2026-10-05'), day('2026-10-05'), false)).toEqual({ days: 0, workdays: 0, weekendDays: 0 })
    expect(spanBetween(day('2026-10-05'), day('2026-10-05'), true)).toEqual({ days: 1, workdays: 1, weekendDays: 0 })
  })

  it('ngày kết thúc đứng trước thì ra số âm cùng độ lớn', () => {
    expect(spanBetween(day('2026-10-09'), day('2026-10-05'), false)).toEqual({ days: -4, workdays: -4, weekendDays: 0 })
    // Thứ Hai lùi về Thứ Bảy: ngày bị loại là Thứ Hai (ngày bắt đầu), còn lại CN + T7.
    expect(spanBetween(day('2026-10-05'), day('2026-10-03'), false)).toEqual({ days: -2, workdays: 0, weekendDays: -2 })
    expect(spanBetween(day('2026-10-05'), day('2026-10-03'), true)).toEqual({ days: -3, workdays: -1, weekendDays: -2 })
  })

  it('qua năm nhuận', () => {
    expect(spanBetween(day('2024-01-01'), day('2025-01-01'), false).days).toBe(366)
  })

  it('đếm nhanh khớp với đếm từng ngày', () => {
    const start = day('2026-01-01')
    for (let length = 0; length < 60; length++) {
      let expected = 0
      for (let current = start + 1; current <= start + length; current++) if (!isWeekend(current)) expected++
      expect(spanBetween(start, start + length, false).workdays).toBe(expected)
    }
  })
})

describe('addWorkdays', () => {
  it('nhảy qua cuối tuần', () => {
    expect(fromDay(addWorkdays(day('2026-10-02'), 1))).toBe('2026-10-05')
    expect(fromDay(addWorkdays(day('2026-10-05'), 5))).toBe('2026-10-12')
    expect(fromDay(addWorkdays(day('2026-10-05'), 10))).toBe('2026-10-19')
  })

  it('bắt đầu từ cuối tuần thì ngày đầu tiên được tính là thứ Hai', () => {
    expect(fromDay(addWorkdays(day('2026-10-03'), 1))).toBe('2026-10-05')
    expect(fromDay(addWorkdays(day('2026-10-04'), 1))).toBe('2026-10-05')
  })

  it('lùi về trước', () => {
    expect(fromDay(addWorkdays(day('2026-10-05'), -1))).toBe('2026-10-02')
    expect(fromDay(addWorkdays(day('2026-10-12'), -5))).toBe('2026-10-05')
  })

  it('cộng 0 trả về chính ngày đó, kể cả cuối tuần', () => {
    expect(fromDay(addWorkdays(day('2026-10-03'), 0))).toBe('2026-10-03')
  })

  it('khớp với cách đếm từng ngày', () => {
    for (let offset = 0; offset < 7; offset++) {
      const start = day('2026-10-05') + offset
      for (let count = 1; count <= 23; count++) {
        let current = start
        let left = count
        while (left > 0) {
          current++
          if (!isWeekend(current)) left--
        }
        expect(addWorkdays(start, count)).toBe(current)
      }
    }
  })
})

describe('weeksLabel', () => {
  it('chỉ nói theo tuần khi từ 7 ngày', () => {
    expect(weeksLabel(6)).toBeNull()
    expect(weeksLabel(7)).toBe('1 tuần')
    expect(weeksLabel(23)).toBe('3 tuần 2 ngày')
    expect(weeksLabel(-14)).toBe('2 tuần')
  })
})
