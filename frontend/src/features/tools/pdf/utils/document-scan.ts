import type { Quad } from '../types/text-layer.types'
import { perspectiveMatrix, validPaperCorners } from './ocr-perspective'

export type ScanPreset = 'color' | 'auto' | 'white' | 'bw'
export interface ScanOptions { corners: Quad; preset: ScanPreset; rotation: 0 | 90 | 180 | 270; deskew: boolean }
export const FULL_SCAN_CORNERS: Quad = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }]
export const SCAN_MAX_PIXELS = 4_000_000

export function isWholeScanImage(corners: Quad): boolean {
  return corners.every((point, index) => Math.abs(point.x - FULL_SCAN_CORNERS[index].x) < .01 && Math.abs(point.y - FULL_SCAN_CORNERS[index].y) < .01)
}

/** Estimate the document aspect from opposite edges, never force a photo into A4 proportions. */
export function scanGeometry(corners: Quad, width: number, height: number) {
  if (!validPaperCorners(corners, 1, 1)) throw new Error('SCAN_INVALID_CORNERS')
  const points = corners.map(p => ({ x: p.x * (width - 1), y: p.y * (height - 1) })) as Quad
  const distance = (a: number, b: number) => Math.hypot(points[a].x - points[b].x, points[a].y - points[b].y)
  const w = Math.max(distance(0, 1), distance(3, 2)), h = Math.max(distance(0, 3), distance(1, 2))
  const scale = Math.min(1, 3000 / Math.max(w, h), Math.sqrt(SCAN_MAX_PIXELS / (w * h)))
  const outputWidth = Math.max(2, Math.round(w * scale)), outputHeight = Math.max(2, Math.round(h * scale))
  // A white output border preserves the selected edge pixels without adding invented detail.
  const padding = 8
  const toSource = perspectiveMatrix([{ x: padding, y: padding }, { x: outputWidth + padding - 1, y: padding }, { x: outputWidth + padding - 1, y: outputHeight + padding - 1 }, { x: padding, y: outputHeight + padding - 1 }], points)
  return { width: outputWidth + padding * 2, height: outputHeight + padding * 2, toSource, padding }
}

/** Mild tonal lift. Color ink is deliberately unchanged outside the explicit B&W preset. */
export function scanColor(r: number, g: number, b: number, preset: ScanPreset): [number, number, number] {
  if (preset === 'color') return [r, g, b]
  const gray = .299 * r + .587 * g + .114 * b
  if (preset === 'bw') { const value = gray < 175 ? 0 : 255; return [value, value, value] }
  if (Math.max(r, g, b) - Math.min(r, g, b) > 25) return [r, g, b]
  // No threshold in the color-preserving presets: faint strokes keep their gradation.
  const lift = (value: number) => Math.round(255 * (value / 255) ** (preset === 'white' ? .65 : .88))
  return [lift(r), lift(g), lift(b)]
}
