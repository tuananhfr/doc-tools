import { normalizeDeg } from './azimuth'
import { sunDay, sunPosition, type SunDay, type SunPosition } from './solar'

export interface SolarInput {
  latitude: number
  longitude: number
  /** 'YYYY-MM-DD' và 'HH:mm' theo giờ của máy đang xem. */
  date: string
  time: string
}

export interface SolarReading {
  now: SunPosition
  day: SunDay
  /** Vị trí mặt trời mỗi 15 phút khi còn trên trời — để biết mặt tiền đón nắng lúc nào. */
  track: { position: SunPosition; morning: boolean }[]
}

const TRACK_STEP_MINUTES = 15

/** Góc lệch nhỏ nhất giữa hai hướng, 0–180°. */
export function angleBetween(a: number, b: number): number {
  const diff = Math.abs(normalizeDeg(a) - normalizeDeg(b))
  return diff > 180 ? 360 - diff : diff
}

/** Mặt tiền "đón" mặt trời khi mặt trời đang trên trời và lệch hướng mặt tiền chưa tới 90°. */
export function facesSun(front: number, sun: SunPosition): boolean {
  return sun.elevation > 0 && angleBetween(front, sun.azimuth) < 90
}

export type DaySide = 'MORNING' | 'AFTERNOON' | 'BOTH' | 'NONE'

/**
 * Mặt tiền nhận nắng buổi nào trong ngày — xét cả đường đi của mặt trời, không chỉ
 * hướng mọc / lặn: nhà hướng Nam ngày xuân phân lệch đúng 90° với cả hai mà vẫn đón
 * nắng gần trọn ngày. Trả lời câu người ta thật sự hỏi: "nhà này có bị nắng chiều không".
 */
export function daySide(front: number, reading: SolarReading): DaySide {
  const lit = reading.track.filter((sample) => facesSun(front, sample.position))
  const morning = lit.some((sample) => sample.morning)
  const afternoon = lit.some((sample) => !sample.morning)
  if (morning && afternoon) return 'BOTH'
  if (morning) return 'MORNING'
  if (afternoon) return 'AFTERNOON'
  return 'NONE'
}

export function validCoordinates(latitude: number, longitude: number): boolean {
  return Number.isFinite(latitude) && Number.isFinite(longitude) && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180
}

/** Null khi thiếu / sai ngày giờ hoặc toạ độ — phần mặt trời không có thì thôi, không chặn phần đo. */
export function readSolar(input: SolarInput | null): SolarReading | null {
  if (!input || !validCoordinates(input.latitude, input.longitude)) return null
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(input.time)
  if (!dateMatch || !timeMatch) return null
  const [year, month, day] = dateMatch.slice(1).map(Number)
  const [hour, minute] = timeMatch.slice(1).map(Number)
  const at = new Date(year, month - 1, day, hour, minute)
  if (Number.isNaN(at.getTime())) return null
  const sunDayInfo = sunDay(year, month, day, input.latitude, input.longitude)
  return { now: sunPosition(at, input.latitude, input.longitude), day: sunDayInfo, track: sunTrack(sunDayInfo, input.latitude, input.longitude) }
}

/** Vùng cực mặt trời không mọc / không lặn: xét trọn 24 giờ quanh chính trưa, mẫu dưới chân trời tự bị loại. */
function sunTrack(day: SunDay, latitude: number, longitude: number): SolarReading['track'] {
  const noon = day.noon.getTime()
  const from = day.sunrise?.getTime() ?? noon - 12 * 3_600_000
  const to = day.sunset?.getTime() ?? noon + 12 * 3_600_000
  const track: SolarReading['track'] = []
  for (let time = from; time <= to; time += TRACK_STEP_MINUTES * 60_000) {
    const position = sunPosition(new Date(time), latitude, longitude)
    if (position.elevation > 0) track.push({ position, morning: time < noon })
  }
  return track
}
