import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatProEnd, shortDay, vietnamDatePlus } from './admin-format'

describe('admin-format', () => {
  it('reads numbers as epoch seconds and strings as ISO, both in Vietnam time', () => {
    // 2026-10-07T17:30:00Z is already 8 October in Vietnam.
    expect(formatDate(Date.UTC(2026, 9, 7, 17, 30) / 1000)).toBe('08/10/2026')
    expect(formatDate('2026-10-07T17:30:00.000Z')).toBe('08/10/2026')
    expect(formatDateTime('2026-10-07T17:30:00.000Z')).toContain('00:30')
  })

  it('renders a dash for missing values', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDateTime(undefined)).toBe('—')
    expect(formatDate('')).toBe('—')
  })

  it('shows the last included day of a Pro plan, not the exclusive end', () => {
    const midnightVietnam = Date.UTC(2026, 10, 30, 17) / 1000 // 01/12/2026 00:00 in Vietnam
    expect(formatProEnd(midnightVietnam)).toBe('30/11/2026')
  })

  it('counts days on the Vietnam calendar', () => {
    const lateUtc = Date.UTC(2026, 9, 7, 18) // 01:00 on 8 October in Vietnam
    expect(vietnamDatePlus(0, lateUtc)).toBe('2026-10-08')
    expect(vietnamDatePlus(30, lateUtc)).toBe('2026-11-07')
  })

  it('shortens a day key for chart axes', () => {
    expect(shortDay('2026-10-08')).toBe('08/10')
  })
})
