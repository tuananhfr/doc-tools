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
}

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
 * Mặt tiền nhận nắng buổi nào trong ngày, xét theo hướng mọc / lặn. Thô nhưng
 * đủ trả lời câu người ta thật sự hỏi: "nhà này có bị nắng chiều không".
 */
export function daySide(front: number, day: SunDay): DaySide {
  const morning = day.riseAzimuth !== null && angleBetween(front, day.riseAzimuth) < 90
  const afternoon = day.setAzimuth !== null && angleBetween(front, day.setAzimuth) < 90
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
  return { now: sunPosition(at, input.latitude, input.longitude), day: sunDay(year, month, day, input.latitude, input.longitude) }
}
