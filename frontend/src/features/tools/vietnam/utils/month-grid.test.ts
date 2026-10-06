import { describe, expect, it } from 'vitest'
import { buildMonthGrid, shiftMonth } from './month-grid'

describe('month grid', () => {
  it('starts on Monday and always spans six weeks', () => {
    const grid = buildMonthGrid(2026, 10)
    expect(grid).toHaveLength(42)
    expect(grid[0].date).toBe('2026-09-28')
    expect(grid[0].weekday).toBe(1)
    expect(grid.filter((cell) => cell.inMonth)).toHaveLength(31)
  })
  it('attaches the lunar date of each cell', () => {
    const tet = buildMonthGrid(2026, 2).find((cell) => cell.date === '2026-02-17')
    expect(tet).toMatchObject({ lunarDay: 1, lunarMonth: 1, lunarLeap: false })
  })
  it('shifts across year boundaries', () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 })
  })
})
