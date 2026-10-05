import { describe, expect, it } from 'vitest'
import { canChi, lunarToSolar, solarToLunar } from './lunar-calendar'

describe('Vietnamese lunar conversion', () => {
  it('converts the 2024 Tết reference date and can chi', () => {
    const lunar = solarToLunar({ day: 10, month: 2, year: 2024 })
    expect(lunar).toMatchObject({ day: 1, month: 1, year: 2024, leap: false })
    expect(lunar && canChi(lunar)).toMatchObject({ day: 'Giáp Thìn', month: 'Bính Dần', year: 'Giáp Thìn' })
    expect(lunarToSolar({ day: 1, month: 1, year: 2024 })).toEqual({ day: 10, month: 2, year: 2024 })
  })
  it('rejects impossible dates and invalid leap months', () => {
    expect(solarToLunar({ day: 31, month: 2, year: 2024 })).toBeNull()
    expect(lunarToSolar({ day: 31, month: 1, year: 2024 })).toBeNull()
    expect(lunarToSolar({ day: 1, month: 1, year: 2024, leap: true })).toBeNull()
  })
  it('round trips each day across lunar new year and leap years', () => {
    for (let year = 2020; year <= 2030; year++) for (let month = 1; month <= 12; month++) {
      const solar = { day: 15, month, year }
      const lunar = solarToLunar(solar)
      expect(lunar && lunarToSolar(lunar)).toEqual(solar)
    }
  })
})
