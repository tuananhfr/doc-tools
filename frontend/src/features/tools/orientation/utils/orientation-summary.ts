import { targetSpec } from '../config/targets'
import type { NorthReference, OrientationSource, OrientationTarget } from '../types/orientation.types'
import { directionOf, formatDeg, targetAzimuth, type Direction } from './azimuth'
import type { OrientationState } from './orientation-state'

export const NORTH_LABEL: Record<NorthReference, string> = {
  TRUE: 'Bắc thật',
  MAGNETIC: 'Bắc từ',
  PROJECT: 'Bắc dự án',
}

export const SOURCE_LABEL: Record<OrientationSource, string> = {
  DRAWING: 'đặt trên bản vẽ',
  MANUAL: 'nhập tay',
  DEVICE: 'la bàn điện thoại',
  SURVEY: 'số đo đạc',
}

export function targetLabel(target: OrientationTarget): string {
  const custom = target.type === 'CUSTOM' ? target.label?.trim() : ''
  return custom || targetSpec(target.type).label
}

export interface Measurement {
  target: OrientationTarget
  azimuth: number | null
  direction: Direction | null
}

/** Số đo của từng đối tượng; đối tượng đang chọn đứng đầu. */
export function measurements(state: OrientationState): Measurement[] {
  const ordered = [...state.targets].sort((a, b) => Number(b.id === state.activeId) - Number(a.id === state.activeId))
  return ordered.map((target) => {
    const azimuth = targetAzimuth(target, state.anchor, state.targets)
    return { target, azimuth, direction: azimuth === null ? null : directionOf(azimuth, state.divisions) }
  })
}

/** "la bàn điện thoại · sai số ±15°" — không có sai số thì không ghi, spec §9: không giả độ chính xác. */
export function provenance(state: OrientationState): string | null {
  if (!state.anchor) return null
  const accuracy = state.anchor.source !== 'DRAWING' && state.anchor.accuracy !== null ? ` · sai số ±${Math.round(state.anchor.accuracy)}°` : ''
  return `${NORTH_LABEL[state.northReference]} · ${SOURCE_LABEL[state.anchor.source]}${accuracy}`
}

const stamp = (date: Date) =>
  `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`

/**
 * Chú thích in kèm ảnh / PDF xuất ra: ảnh được gửi đi xa khỏi công cụ, người
 * nhận phải đọc được con số và nó đo theo Bắc nào mà không cần mở lại công cụ.
 */
export function legendLines(state: OrientationState, now: Date, extra: string[] = []): string[] {
  const lines = measurements(state)
    .filter((item) => item.azimuth !== null)
    .map((item) => `${targetLabel(item.target)}: ${formatDeg(item.azimuth ?? 0)} · ${item.direction?.name}`)
  const origin = provenance(state)
  if (origin) lines.push(origin)
  lines.push(...extra)
  lines.push(`Chuyện Nhỏ · ERPCons · ${stamp(now)}`)
  return lines
}
