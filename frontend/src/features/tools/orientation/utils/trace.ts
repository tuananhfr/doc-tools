import type { Axis, Point } from '../types/orientation.types'
import { axisAngle, normalizeDeg, pointAt } from './azimuth'

export type TraceTool = 'polygon' | 'line' | 'rect'

/** Nhãn ngữ nghĩa của một đường vẽ — gắn vào là đường đó sinh ra trục của đối tượng tương ứng. */
export type TraceTag = 'FRONTAGE' | 'ENTRANCE'

export interface TraceShape {
  id: string
  kind: TraceTool
  points: Point[]
  tag: TraceTag | null
  /** Trục vuông góc đi về phía nào của đường: 1 = bên trái chiều vẽ, -1 = bên phải. */
  side: 1 | -1
}

export interface TraceState {
  /** null = đang đặt hướng, không vẽ. */
  tool: TraceTool | null
  shapes: TraceShape[]
  draft: Point[]
  snap: boolean
}

export const INITIAL_TRACE: TraceState = { tool: null, shapes: [], draft: [], snap: false }

export const MIN_POLYGON_POINTS = 3

/** Hai góc đối của khung chữ nhật → 4 đỉnh theo chiều kim đồng hồ. */
export function rectPoints(a: Point, b: Point): Point[] {
  return [
    { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y) },
    { x: Math.max(a.x, b.x), y: Math.min(a.y, b.y) },
    { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y) },
    { x: Math.min(a.x, b.x), y: Math.max(a.y, b.y) },
  ]
}

/** Bám góc theo bước `step` độ (so với trục ảnh), giữ nguyên độ dài. */
export function snapPoint(from: Point, to: Point, step = 45): Point {
  const angle = axisAngle({ from, to })
  if (angle === null) return to
  const snapped = Math.round(angle / step) * step
  return pointAt(from, snapped, Math.hypot(to.x - from.x, to.y - from.y))
}

/**
 * Trục của đối tượng sinh ra từ một đường tường: vuông góc với đường, đặt ở
 * giữa đường, chĩa về phía `side`. Tường mặt tiền thì trục là hướng nhà.
 */
export function perpendicularAxis(line: Point[], side: 1 | -1): Axis | null {
  if (line.length < 2) return null
  const [a, b] = line
  const angle = axisAngle({ from: a, to: b })
  if (angle === null) return null
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const length = Math.max(Math.hypot(b.x - a.x, b.y - a.y) * 0.5, 1)
  // Bên trái chiều vẽ = quay ngược chiều kim đồng hồ 90°.
  const deg = normalizeDeg(angle - 90 * side)
  return { from: middle, to: pointAt(middle, deg, length) }
}

/** Dời cả hình theo một vector — kéo cả hình chứ không chỉ một đỉnh. */
export function shiftPoints(points: Point[], dx: number, dy: number): Point[] {
  return points.map((point) => ({ x: point.x + dx, y: point.y + dy }))
}
