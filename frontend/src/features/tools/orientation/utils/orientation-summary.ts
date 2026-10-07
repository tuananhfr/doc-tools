import { dateTimeFormat } from '@/i18n/intl'
import { translate } from '@/i18n/runtime'
import type { OrientationTarget } from '../types/orientation.types'
import { directionOf, formatDeg, targetAzimuth, type Direction } from './azimuth'
import type { OrientationState } from './orientation-state'

/** Tên đối tượng theo ngôn ngữ trang — cả trên màn hình lẫn trong tệp xuất. */
export function targetLabel(target: OrientationTarget): string {
  const custom = target.type === 'CUSTOM' ? target.label?.trim() : ''
  return custom || translate(`orientation:targets.${target.type}.label`)
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
  const values = { north: translate(`orientation:north.${state.northReference}`), source: translate(`orientation:sources.${state.anchor.source}`) }
  return state.anchor.source !== 'DRAWING' && state.anchor.accuracy !== null
    ? translate('orientation:provenance.withAccuracy', { ...values, accuracy: Math.round(state.anchor.accuracy) })
    : translate('orientation:provenance.plain', values)
}

const STAMP_FORMAT: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }

/**
 * Chú thích in kèm ảnh / PDF xuất ra: ảnh được gửi đi xa khỏi công cụ, người
 * nhận phải đọc được con số và nó đo theo Bắc nào mà không cần mở lại công cụ.
 */
export function legendLines(state: OrientationState, now: Date, extra: string[] = []): string[] {
  const lines = measurements(state)
    .filter((item) => item.azimuth !== null)
    .map((item) => translate('orientation:legend.target', { target: targetLabel(item.target), degree: formatDeg(item.azimuth ?? 0), direction: item.direction?.name ?? '' }))
  const origin = provenance(state)
  if (origin) lines.push(origin)
  lines.push(...extra)
  lines.push(translate('orientation:legend.footer', { time: dateTimeFormat(STAMP_FORMAT).format(now) }))
  return lines
}
