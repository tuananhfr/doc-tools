export interface CalendarDate { day: number; month: number; year: number }
export interface LunarDate extends CalendarDate { leap: boolean; julianDay: number }

const floor = Math.floor
const timezone = 7

function julianDayFromDate({ day, month, year }: CalendarDate): number {
  const a = floor((14 - month) / 12)
  const y = year + 4800 - a
  const m = month + 12 * a - 3
  let result = day + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - floor(y / 100) + floor(y / 400) - 32045
  if (result < 2299161) result = day + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - 32083
  return result
}

function dateFromJulianDay(julianDay: number): CalendarDate {
  let b = 0
  let c: number
  if (julianDay > 2299160) {
    const a = julianDay + 32044
    b = floor((4 * a + 3) / 146097)
    c = a - floor(b * 146097 / 4)
  } else c = julianDay + 32082
  const d = floor((4 * c + 3) / 1461)
  const e = c - floor(1461 * d / 4)
  const m = floor((5 * e + 2) / 153)
  return { day: e - floor((153 * m + 2) / 5) + 1, month: m + 3 - 12 * floor(m / 10), year: b * 100 + d - 4800 + floor(m / 10) }
}

function newMoon(k: number): number {
  const t = k / 1236.85
  const t2 = t * t
  const t3 = t2 * t
  const radians = Math.PI / 180
  let jd = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3
  jd += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * radians)
  const m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3
  const mp = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3
  let correction = (0.1734 - 0.000393 * t) * Math.sin(m * radians) + 0.0021 * Math.sin(2 * m * radians)
  correction -= 0.4068 * Math.sin(mp * radians) - 0.0161 * Math.sin(2 * mp * radians)
  correction -= 0.0004 * Math.sin(3 * mp * radians)
  correction += 0.0104 * Math.sin(2 * f * radians) - 0.0051 * Math.sin((m + mp) * radians)
  correction -= 0.0074 * Math.sin((m - mp) * radians) - 0.0004 * Math.sin((2 * f + m) * radians)
  correction -= 0.0004 * Math.sin((2 * f - m) * radians) + 0.0006 * Math.sin((2 * f + mp) * radians)
  correction += 0.0010 * Math.sin((2 * f - mp) * radians) + 0.0005 * Math.sin((2 * mp + m) * radians)
  const delta = t < -11 ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3 : -0.000278 + 0.000265 * t + 0.000262 * t2
  return jd + correction - delta
}

function sunLongitude(julianDay: number): number {
  const t = (julianDay - 2451545) / 36525
  const t2 = t * t
  const radians = Math.PI / 180
  const m = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t * t2
  const l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2
  let delta = (1.914600 - 0.004817 * t - 0.000014 * t2) * Math.sin(m * radians)
  delta += (0.019993 - 0.000101 * t) * Math.sin(2 * m * radians) + 0.000290 * Math.sin(3 * m * radians)
  const longitude = (l0 + delta) * radians
  return longitude - Math.PI * 2 * floor(longitude / (Math.PI * 2))
}

function sunSector(day: number): number { return floor(sunLongitude(day - 0.5 - timezone / 24) / Math.PI * 6) }
function newMoonDay(k: number): number { return floor(newMoon(k) + 0.5 + timezone / 24) }
function monthEleven(year: number): number {
  const k = floor((julianDayFromDate({ day: 31, month: 12, year }) - 2415021) / 29.530588853)
  const moon = newMoonDay(k)
  return sunSector(moon) >= 9 ? newMoonDay(k - 1) : moon
}
function leapMonthOffset(monthElevenDay: number): number {
  const k = floor((monthElevenDay - 2415021.076998695) / 29.530588853 + 0.5)
  let index = 1
  let sector = sunSector(newMoonDay(k + index))
  let previous: number
  do { previous = sector; index++; sector = sunSector(newMoonDay(k + index)) } while (sector !== previous && index < 14)
  return index - 1
}

function validSolar(date: CalendarDate): boolean {
  if (![date.day, date.month, date.year].every(Number.isInteger) || date.year < 1800 || date.year > 2199) return false
  const candidate = new Date(Date.UTC(date.year, date.month - 1, date.day))
  return candidate.getUTCFullYear() === date.year && candidate.getUTCMonth() + 1 === date.month && candidate.getUTCDate() === date.day
}

export function solarToLunar(date: CalendarDate): LunarDate | null {
  if (!validSolar(date)) return null
  const julianDay = julianDayFromDate(date)
  const k = floor((julianDay - 2415021.076998695) / 29.530588853)
  let monthStart = newMoonDay(k + 1)
  if (monthStart > julianDay) monthStart = newMoonDay(k)
  let a11 = monthEleven(date.year)
  let b11 = a11
  let year: number
  if (a11 >= monthStart) { year = date.year; a11 = monthEleven(date.year - 1) }
  else { year = date.year + 1; b11 = monthEleven(date.year + 1) }
  const day = julianDay - monthStart + 1
  const offset = floor((monthStart - a11) / 29)
  let leap = false
  let month = offset + 11
  if (b11 - a11 > 365) {
    const leapOffset = leapMonthOffset(a11)
    if (offset >= leapOffset) { month = offset + 10; if (offset === leapOffset) leap = true }
  }
  if (month > 12) month -= 12
  if (month >= 11 && offset < 4) year -= 1
  return { day, month, year, leap, julianDay }
}

export function lunarToSolar(date: CalendarDate & { leap?: boolean }): CalendarDate | null {
  if (![date.day, date.month, date.year].every(Number.isInteger) || date.day < 1 || date.day > 30 || date.month < 1 || date.month > 12 || date.year < 1800 || date.year > 2199) return null
  const a11 = date.month < 11 ? monthEleven(date.year - 1) : monthEleven(date.year)
  const b11 = date.month < 11 ? monthEleven(date.year) : monthEleven(date.year + 1)
  const k = floor(0.5 + (a11 - 2415021.076998695) / 29.530588853)
  let offset = date.month - 11
  if (offset < 0) offset += 12
  if (b11 - a11 > 365) {
    const leapOffset = leapMonthOffset(a11)
    let leapMonth = leapOffset - 2
    if (leapMonth < 0) leapMonth += 12
    if (date.leap && date.month !== leapMonth) return null
    if (date.leap || offset >= leapOffset) offset += 1
  } else if (date.leap) return null
  const solar = dateFromJulianDay(newMoonDay(k + offset) + date.day - 1)
  const roundtrip = solarToLunar(solar)
  return roundtrip && roundtrip.day === date.day && roundtrip.month === date.month && roundtrip.year === date.year && roundtrip.leap === Boolean(date.leap) ? solar : null
}

const stems = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý']
const branches = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi']
export function canChi(date: LunarDate) {
  return {
    year: `${stems[(date.year + 6) % 10]} ${branches[(date.year + 8) % 12]}`,
    month: `${stems[(date.year * 12 + date.month + 3) % 10]} ${branches[(date.month + 1) % 12]}`,
    day: `${stems[(date.julianDay + 9) % 10]} ${branches[(date.julianDay + 1) % 12]}`,
  }
}
