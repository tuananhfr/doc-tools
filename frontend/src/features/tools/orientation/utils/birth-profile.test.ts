import { describe, expect, it } from 'vitest'
import { birthProfile, napAmOf } from './birth-profile'

describe('napAmOf', () => {
  it.each([
    [1984, 'Hải Trung Kim'],
    [1985, 'Hải Trung Kim'],
    [1986, 'Lư Trung Hoả'],
    [1990, 'Lộ Bàng Thổ'],
    [2000, 'Bạch Lạp Kim'],
    [2026, 'Thiên Hà Thuỷ'],
    [1924, 'Hải Trung Kim'],
  ])('%i → %s', (year, name) => {
    expect(napAmOf(year).name).toBe(name)
  })
})

describe('birthProfile', () => {
  it('ảnh mẫu: 15/9/1986 là Bính Dần, Lư Trung Hoả', () => {
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 15, month: 9, year: 1986 })).toMatchObject({
      lunarYear: 1986,
      canChi: 'Bính Dần',
      napAm: { name: 'Lư Trung Hoả', element: 'Hoả' },
      beforeNewYear: false,
    })
  })

  it('sinh trước Tết thì lấy năm âm lịch trước — Tết 1986 rơi ngày 9/2', () => {
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 20, month: 1, year: 1986 })).toMatchObject({ lunarYear: 1985, canChi: 'Ất Sửu', beforeNewYear: true })
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 8, month: 2, year: 1986 })?.lunarYear).toBe(1985)
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 9, month: 2, year: 1986 })?.lunarYear).toBe(1986)
  })

  it('chỉ nhập năm âm lịch cũng đủ', () => {
    expect(birthProfile({ kind: 'LUNAR_YEAR', year: 2000 })).toMatchObject({ canChi: 'Canh Thìn', napAm: { name: 'Bạch Lạp Kim' } })
  })

  it('đầu khoảng bộ luật (1900–1930) vẫn đổi được lịch âm', () => {
    // Tết 1900 rơi ngày 31/1/1900; Tết 1930 ngày 30/1/1930.
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 30, month: 1, year: 1900 })?.lunarYear).toBe(1899)
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 31, month: 1, year: 1900 })).toMatchObject({ lunarYear: 1900, canChi: 'Canh Tý' })
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 30, month: 1, year: 1930 })?.lunarYear).toBe(1930)
  })

  it('ngày không có thật → null, không đoán', () => {
    expect(birthProfile({ kind: 'SOLAR_DATE', day: 31, month: 2, year: 1990 })).toBeNull()
    expect(birthProfile({ kind: 'LUNAR_YEAR', year: Number.NaN })).toBeNull()
  })
})
