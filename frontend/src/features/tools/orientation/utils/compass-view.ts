import { targetSpec } from '../config/targets'
import type { Size } from '../types/orientation.types'
import { imageNorth } from './azimuth'
import type { CompassNeedle, CompassRings, CompassSpec, StarSegment } from './compass-geometry'
import type { OrientationState } from './orientation-state'
import { measurements } from './orientation-summary'
import type { PersonReading } from './rule-engine'

/** Lớp phụ vẽ trên la bàn, không thuộc trạng thái đo. */
export interface CompassExtras {
  /** Hướng mặt trời (độ, so với Bắc); null = không vẽ. */
  sun?: number | null
  /** Vòng sao của gia chủ đang xem; null = chưa nhập tuổi. */
  stars?: StarSegment[] | null
}

function needles(state: OrientationState): CompassNeedle[] {
  return measurements(state).flatMap((item) => {
    if (item.azimuth === null) return []
    const custom = item.target.type === 'CUSTOM' ? item.target.label?.trim() : ''
    return [{ azimuth: item.azimuth, label: custom || targetSpec(item.target.type).short, active: item.target.id === state.activeId }]
  })
}

/** Gia chủ xem mặt la kinh (24 sơn, quái, sao theo tuổi); chuyên môn giữ la bàn kỹ thuật 8/16 hướng + độ. */
function ringsFor(state: OrientationState, extras: CompassExtras): CompassRings | null {
  return state.mode === 'HOMEOWNER' ? { stars: extras.stars ?? null } : null
}

/** 8 ô của vòng sao theo thứ tự hướng (0 = Bắc). */
export function starSegments(reading: PersonReading): StarSegment[] {
  return reading.segments.map((segment) => ({ label: segment.star.name, good: segment.star.fortune === 'GOOD' }))
}

/**
 * La bàn đặt TRÊN ảnh, theo toạ độ của ảnh đang xem. Null khi chưa biết hướng
 * Bắc nằm đâu trên ảnh — khi đó la bàn chỉ đứng riêng, không xoay bừa lên ảnh.
 */
export function overlayCompass(state: OrientationState, view: Size, extras: CompassExtras = {}): CompassSpec | null {
  const north = imageNorth(state.anchor, state.targets)
  if (!state.compass || north === null) return null
  return {
    center: state.compass.center,
    radius: state.compass.radius * Math.min(view.width, view.height),
    north,
    divisions: state.divisions,
    degrees: state.mode === 'PROFESSIONAL',
    needles: needles(state),
    sun: extras.sun ?? null,
    rings: ringsFor(state, extras),
  }
}

/** La bàn đứng riêng (không ảnh, hoặc chưa đặt được lên ảnh): Bắc luôn ở trên. */
export function standaloneCompass(state: OrientationState, side: number, extras: CompassExtras = {}): CompassSpec {
  return {
    center: { x: side / 2, y: side / 2 },
    // Chừa chỗ cho nhãn kim thò ra ngoài vòng; mặt la kinh nhiều chữ hơn nên được to hơn.
    radius: side * (state.mode === 'HOMEOWNER' ? 0.42 : 0.36),
    north: 0,
    divisions: state.divisions,
    degrees: state.mode === 'PROFESSIONAL',
    needles: needles(state),
    sun: extras.sun ?? null,
    rings: ringsFor(state, extras),
  }
}

/** Đã có ít nhất một số đo — mới có gì để lưu. */
export function hasResult(state: OrientationState): boolean {
  return needles(state).length > 0
}
