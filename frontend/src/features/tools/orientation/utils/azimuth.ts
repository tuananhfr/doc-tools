import { numberFormat } from '@/i18n/intl'
import type { Anchor, Axis, Divisions, OrientationTarget } from '../types/orientation.types'
import { directionLabel } from './terms'

const DEGREE_FORMAT: Intl.NumberFormatOptions = { maximumFractionDigits: 1, useGrouping: false }

/** Đưa mọi góc về [0, 360) — kể cả số âm và số lớn hơn một vòng (spec v1.1 §7). */
export function normalizeDeg(deg: number): number {
  const value = ((deg % 360) + 360) % 360
  // `-0` và 360 do làm tròn số thực đều phải ra 0.
  return value === 360 || Object.is(value, -0) ? 0 : value
}

/**
 * Góc của một trục trên ảnh, đo theo chiều kim đồng hồ từ phía TRÊN của ảnh.
 * Trục y của ảnh hướng xuống nên "lên" là -y. Trả null khi hai đầu trùng nhau.
 */
export function axisAngle(axis: Axis): number | null {
  const dx = axis.to.x - axis.from.x
  const dy = axis.to.y - axis.from.y
  if (Math.hypot(dx, dy) < 1e-9) return null
  return normalizeDeg((Math.atan2(dx, -dy) * 180) / Math.PI)
}

export interface Direction {
  /** Chỉ số cung, 0 = Bắc, tăng theo chiều kim đồng hồ. */
  index: number
  name: string
  short: string
}

/** Tên hướng theo ngôn ngữ trang, thứ tự chỉ số (0 = Bắc). */
export function directionNames(divisions: Divisions): Direction[] {
  return Array.from({ length: divisions }, (_, index) => ({ index, ...directionLabel(divisions, index) }))
}

/**
 * Cung chứa một góc. Mỗi cung căn giữa quanh hướng của nó (Bắc 8 cung = 337,5°–22,5°);
 * góc nằm ĐÚNG ranh giới thuộc về cung kế tiếp theo chiều kim đồng hồ.
 */
export function directionOf(azimuth: number, divisions: Divisions = 8): Direction {
  const width = 360 / divisions
  const index = Math.floor((normalizeDeg(azimuth) + width / 2) / width) % divisions
  return { index, ...directionLabel(divisions, index) }
}

/** "132°" / "132,5°" — một chữ số thập phân khi có, dấu thập phân theo ngôn ngữ trang. */
export function formatDeg(deg: number): string {
  // 359,96° làm tròn ra 360 → phải hiện 0°.
  const rounded = (Math.round(normalizeDeg(deg) * 10) / 10) % 360
  return `${numberFormat(DEGREE_FORMAT).format(rounded)}°`
}

/**
 * Hướng Bắc nằm ở góc nào trên ảnh (đo như `axisAngle`). Null khi chưa đủ dữ kiện:
 * số độ đã biết mà đối tượng của nó chưa có trục trên ảnh thì KHÔNG đặt la bàn lên
 * ảnh được — spec §8: không có mốc thì không tạo hướng giả.
 */
export function imageNorth(anchor: Anchor | null, targets: OrientationTarget[]): number | null {
  if (!anchor) return null
  if (anchor.source === 'DRAWING') return axisAngle(anchor.northAxis)
  const target = targets.find((item) => item.id === anchor.targetId)
  const angle = target?.axis ? axisAngle(target.axis) : null
  return angle === null ? null : normalizeDeg(angle - anchor.azimuth)
}

/** Số độ của một đối tượng: số đã biết của chính nó, hoặc suy từ trục trên ảnh + hướng Bắc trên ảnh. */
export function targetAzimuth(target: OrientationTarget, anchor: Anchor | null, targets: OrientationTarget[]): number | null {
  if (anchor && anchor.source !== 'DRAWING' && anchor.targetId === target.id) return normalizeDeg(anchor.azimuth)
  if (target.known !== undefined) return target.known
  const north = imageNorth(anchor, targets)
  const angle = target.axis ? axisAngle(target.axis) : null
  if (north === null || angle === null) return null
  return normalizeDeg(angle - north)
}

/** Điểm đi `length` theo góc `deg` (chiều kim đồng hồ từ phía trên) tính từ `origin`. */
export function pointAt(origin: { x: number; y: number }, deg: number, length: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: origin.x + Math.sin(rad) * length, y: origin.y - Math.cos(rad) * length }
}
