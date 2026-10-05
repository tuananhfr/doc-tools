import type { OrientationSourceFile } from '../types/source.types'
import type { OrientationState } from './orientation-state'
import { measurements, targetLabel } from './orientation-summary'

/** Vectơ đơn vị theo hệ Đông–Bắc: x = Đông, y = Bắc — phần mềm khác đọc thẳng, không cần biết quy ước độ. */
export interface UnitVector {
  east: number
  north: number
}

export interface OrientationRecord {
  schema: 'erpcons.orientation'
  version: 1
  measuredAt: string
  northReference: OrientationState['northReference']
  source: string | null
  /** Sai số máy báo (độ); null = không biết, KHÔNG phải 0. */
  accuracy: number | null
  divisions: OrientationState['divisions']
  file: { kind: 'image' | 'pdf' | 'none'; name: string | null; page: number | null }
  targets: { type: string; label: string; azimuth: number; direction: string; vector: UnitVector }[]
}

const round = (value: number, digits: number) => Math.round(value * 10 ** digits) / 10 ** digits

export function unitVector(azimuth: number): UnitVector {
  const rad = (azimuth * Math.PI) / 180
  // Cộng 0 để -0 thành 0 — JSON in "-0" trông như lỗi.
  return { east: round(Math.sin(rad), 6) + 0, north: round(Math.cos(rad), 6) + 0 }
}

/**
 * Bản ghi số đo để tải về (chế độ chuyên môn). Chỉ có số đo — không ảnh, không
 * toạ độ, không năm sinh: phần "theo tuổi" không bao giờ được ghi lại (spec v1.1 §13).
 */
export function orientationRecord(state: OrientationState, source: OrientationSourceFile | null, now: Date): OrientationRecord {
  const anchor = state.anchor
  return {
    schema: 'erpcons.orientation',
    version: 1,
    measuredAt: now.toISOString(),
    northReference: state.northReference,
    source: anchor?.source ?? null,
    accuracy: anchor && anchor.source !== 'DRAWING' ? anchor.accuracy : null,
    divisions: state.divisions,
    file: {
      kind: source?.kind ?? 'none',
      name: source?.kind === 'image' ? source.item.name : source?.kind === 'pdf' ? source.name : null,
      page: source?.kind === 'pdf' ? source.pageIndex + 1 : null,
    },
    targets: measurements(state).flatMap(({ target, azimuth, direction }) =>
      azimuth === null || !direction
        ? []
        : [{ type: target.type, label: targetLabel(target), azimuth: round(azimuth, 2), direction: direction.name, vector: unitVector(azimuth) }],
    ),
  }
}
