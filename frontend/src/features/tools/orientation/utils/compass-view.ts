import { targetSpec } from '../config/targets'
import type { Size } from '../types/orientation.types'
import { imageNorth } from './azimuth'
import type { CompassNeedle, CompassSpec } from './compass-geometry'
import type { OrientationState } from './orientation-state'
import { measurements } from './orientation-summary'

function needles(state: OrientationState): CompassNeedle[] {
  return measurements(state).flatMap((item) => {
    if (item.azimuth === null) return []
    const custom = item.target.type === 'CUSTOM' ? item.target.label?.trim() : ''
    return [{ azimuth: item.azimuth, label: custom || targetSpec(item.target.type).short, active: item.target.id === state.activeId }]
  })
}

/**
 * La bàn đặt TRÊN ảnh, theo toạ độ của ảnh đang xem. Null khi chưa biết hướng
 * Bắc nằm đâu trên ảnh — khi đó la bàn chỉ đứng riêng, không xoay bừa lên ảnh.
 */
export function overlayCompass(state: OrientationState, view: Size, sun: number | null = null): CompassSpec | null {
  const north = imageNorth(state.anchor, state.targets)
  if (!state.compass || north === null) return null
  return {
    center: state.compass.center,
    radius: state.compass.radius * Math.min(view.width, view.height),
    north,
    divisions: state.divisions,
    degrees: state.mode === 'PROFESSIONAL',
    needles: needles(state),
    sun,
  }
}

/** La bàn đứng riêng (không ảnh, hoặc chưa đặt được lên ảnh): Bắc luôn ở trên. */
export function standaloneCompass(state: OrientationState, side: number, sun: number | null = null): CompassSpec {
  return {
    center: { x: side / 2, y: side / 2 },
    // Chừa chỗ cho nhãn kim thò ra ngoài vòng.
    radius: side * 0.36,
    north: 0,
    divisions: state.divisions,
    degrees: state.mode === 'PROFESSIONAL',
    needles: needles(state),
    sun,
  }
}

/** Đã có ít nhất một số đo — mới có gì để lưu. */
export function hasResult(state: OrientationState): boolean {
  return needles(state).length > 0
}
