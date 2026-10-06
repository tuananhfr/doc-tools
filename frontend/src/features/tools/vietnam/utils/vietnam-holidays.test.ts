import { describe, expect, it } from 'vitest'
import { holidaysInRange } from './vietnam-holidays'

const on = (date: string) => holidaysInRange(date, date).map((holiday) => holiday.name)

describe('vietnam holidays', () => {
  it('places Lunar New Year and New Year Eve on the real solar dates', () => {
    expect(on('2026-02-17')).toContain('Tết Nguyên đán (mùng 1)')
    expect(on('2026-02-16')).toContain('Giao thừa')
    expect(on('2027-02-06')).toContain('Tết Nguyên đán (mùng 1)')
    // Tháng Chạp năm Giáp Thìn chỉ có 29 ngày: giao thừa 2025 là 29 tháng Chạp.
    expect(on('2025-01-28')).toContain('Giao thừa')
  })
  it('converts traditional lunar festivals', () => {
    expect(on('2025-10-06')).toContain('Tết Trung thu')
    expect(on('2026-09-25')).toContain('Tết Trung thu')
  })
  it('only lists Vietnamese Culture Day from 2026', () => {
    expect(on('2025-11-24')).not.toContain('Ngày Văn hóa Việt Nam')
    expect(on('2026-11-24')).toContain('Ngày Văn hóa Việt Nam')
  })
  it('computes moving Sundays', () => {
    expect(on('2026-05-10')).toContain('Ngày của Mẹ')
    expect(on('2026-06-21')).toContain('Ngày của Cha')
  })
  it('marks the first and full-moon days without duplicating named festivals', () => {
    const tet = holidaysInRange('2026-02-17', '2026-02-17')
    expect(tet.some((holiday) => holiday.layer === 'moon')).toBe(false)
    // Trung thu 2026 là 25/9 nên mùng 1 tháng 8 âm lùi 14 ngày.
    expect(on('2026-09-11')).toContain('Mùng 1 tháng 8')
    expect(on('2026-03-03')).toContain('Rằm tháng Giêng')
  })
  it('includes a lunar December festival that falls in the next solar year', () => {
    expect(holidaysInRange('2026-02-01', '2026-02-28').map((holiday) => holiday.name)).toContain('Ông Công Ông Táo')
  })
  it('rejects broken or oversized ranges', () => {
    expect(holidaysInRange('2026-02-10', '2026-02-01')).toEqual([])
    expect(holidaysInRange('2020-01-01', '2026-01-01')).toEqual([])
  })
})
