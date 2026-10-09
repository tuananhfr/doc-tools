import { describe, expect, it } from 'vitest'
import { leaveDateProblem, parseFormDate } from './form-dates'

describe('parseFormDate', () => {
  it('đọc ngày kiểu Việt với các dấu tách thường gặp', () => {
    expect(parseFormDate('9/10/2026')).toEqual(new Date(2026, 9, 9))
    expect(parseFormDate('09-10-2026')).toEqual(new Date(2026, 9, 9))
    expect(parseFormDate(' 09.10.2026 ')).toEqual(new Date(2026, 9, 9))
  })

  it('từ chối ngày không có trên lịch hoặc sai dạng', () => {
    expect(parseFormDate('31/02/2026')).toBeNull()
    expect(parseFormDate('2026-10-09')).toBeNull()
    expect(parseFormDate('mai')).toBeNull()
  })
})

describe('leaveDateProblem', () => {
  it('cho phép để trống để viết tay', () => {
    expect(leaveDateProblem('', '')).toBeNull()
    expect(leaveDateProblem('01/10/2026', '')).toBeNull()
  })

  it('báo ô nào sai và khi ngày kết thúc trước ngày bắt đầu', () => {
    expect(leaveDateProblem('32/10/2026', '01/11/2026')).toBe('from')
    expect(leaveDateProblem('01/10/2026', 'thứ hai')).toBe('to')
    expect(leaveDateProblem('05/10/2026', '01/10/2026')).toBe('order')
    expect(leaveDateProblem('01/10/2026', '01/10/2026')).toBeNull()
  })
})
