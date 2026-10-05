import type { Axis, Size } from '../types/orientation.types'
import { axisAngle, pointAt } from './azimuth'
import type { CompassRole, CompassShape } from './compass-geometry'
import type { OrientationState } from './orientation-state'
import type { TraceTag } from './trace'

const TAG_LABEL: Record<TraceTag, string> = { FRONTAGE: 'Mặt tiền', ENTRANCE: 'Cửa chính' }

/** Cỡ nét / chữ theo ảnh, không theo màn hình — giống công cụ đo ảnh: ảnh xuất trông như lúc làm. */
export function sceneUnit(view: Size): number {
  return Math.max(view.width, view.height) / 900
}

function arrow(axis: Axis, role: CompassRole, unit: number, label: string | null): CompassShape[] {
  const angle = axisAngle(axis)
  if (angle === null) return []
  const head = 12 * unit
  const shapes: CompassShape[] = [
    { kind: 'path', points: [axis.from, pointAt(axis.to, angle + 180, head * 0.6)], closed: false, role, width: 3 * unit },
    { kind: 'polygon', points: [axis.to, pointAt(axis.to, angle + 155, head), pointAt(axis.to, angle - 155, head)], role },
  ]
  if (label) shapes.push({ kind: 'text', at: pointAt(axis.to, angle, 14 * unit), text: label, role, size: 12 * unit, weight: 700 })
  return shapes
}

/**
 * Phần vẽ trên ảnh ngoài la bàn: nét vẽ tay, mũi tên Bắc, trục của từng đối tượng.
 * Cùng danh sách cho bản xem và ảnh xuất (spec v1.1 §15: "TRÊN NHÀ / BẢN VẼ").
 */
export function sceneShapes(state: OrientationState, view: Size, labelOf: (id: string) => string): CompassShape[] {
  const unit = sceneUnit(view)
  const shapes: CompassShape[] = []

  for (const shape of state.trace.shapes) {
    const role: CompassRole = shape.tag ? 'trace-tag' : 'trace'
    const closed = shape.kind !== 'line'
    shapes.push({ kind: 'path', points: shape.points, closed, role, width: (shape.tag ? 3 : 2.2) * unit, fill: closed })
    if (shape.tag && shape.points.length >= 2) {
      const [a, b] = shape.points
      shapes.push({ kind: 'text', at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 14 * unit }, text: TAG_LABEL[shape.tag], role, size: 11 * unit, weight: 700 })
    }
  }
  if (state.trace.draft.length > 1) {
    shapes.push({ kind: 'path', points: state.trace.draft, closed: false, role: 'draft', width: 2 * unit, dash: [5 * unit, 4 * unit] })
  }

  if (state.anchor?.source === 'DRAWING') shapes.push(...arrow(state.anchor.northAxis, 'north', unit, 'B'))
  // Đối tượng đang chọn vẽ sau cùng để nằm trên.
  const ordered = [...state.targets].sort((a, b) => Number(a.id === state.activeId) - Number(b.id === state.activeId))
  for (const target of ordered) {
    if (target.axis) shapes.push(...arrow(target.axis, target.id === state.activeId ? 'target-active' : 'target', unit, labelOf(target.id)))
  }
  return shapes
}
