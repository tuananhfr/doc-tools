import type { Point } from '../types/image.types'
import type { MeasureReference, MeasureScale, MeasureShape } from '../types/measure.types'
import { numberFormat } from '@/i18n/intl'
import { translate } from '@/i18n/runtime'

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y)
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
}

/** Diện tích đa giác (công thức dây giày), không phụ thuộc chiều đi của các đỉnh. */
export function polygonArea(points: Point[]): number {
  let twice = 0
  for (let index = 0; index < points.length; index++) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    twice += current.x * next.y - next.x * current.y
  }
  return Math.abs(twice) / 2
}

export function polygonPerimeter(points: Point[]): number {
  let total = 0
  for (let index = 0; index < points.length; index++) total += distance(points[index], points[(index + 1) % points.length])
  return total
}

/** Trung bình các đỉnh — đủ để đặt nhãn, không cần trọng tâm thật của đa giác. */
export function centerOf(points: Point[]): Point {
  const sum = points.reduce((total, point) => ({ x: total.x + point.x, y: total.y + point.y }), { x: 0, y: 0 })
  return { x: sum.x / points.length, y: sum.y / points.length }
}

/** null khi chưa đủ dữ kiện: chưa đặt đoạn, chưa nhập chiều dài, hoặc hai đầu đoạn trùng nhau. */
export function scaleOf(reference: MeasureReference | null): MeasureScale | null {
  if (!reference || !reference.length || reference.length <= 0) return null
  const pixels = distance(reference.points[0], reference.points[1])
  if (pixels < 1) return null
  return { perPixel: reference.length / pixels, unit: reference.unit }
}

function number(value: number, digits: number): string {
  return numberFormat({ maximumFractionDigits: digits }).format(value)
}

/** "3,25 m" khi có đoạn chuẩn; chưa có thì ghi theo điểm ảnh — không bịa đơn vị. */
export function formatLength(pixels: number, scale: MeasureScale | null): string {
  if (!scale) return `${number(pixels, 0)} px`
  return `${number(pixels * scale.perPixel, 2)} ${scale.unit}`
}

export function formatArea(squarePixels: number, scale: MeasureScale | null): string {
  if (!scale) return `${number(squarePixels, 0)} px²`
  return `${number(squarePixels * scale.perPixel ** 2, 2)} ${scale.unit}²`
}

/** Chữ ghi trên ảnh cạnh mỗi hình; điểm đếm ghi số thứ tự trong các điểm đếm. */
export function shapeLabel(shape: MeasureShape, shapes: MeasureShape[], scale: MeasureScale | null): string {
  if (shape.kind === 'distance') return formatLength(distance(shape.points[0], shape.points[1]), scale)
  if (shape.kind === 'area') return formatArea(polygonArea(shape.points), scale)
  return String(shapes.filter((other) => other.kind === 'count' && other.id <= shape.id).length)
}

/** Nhãn của đoạn chuẩn: "Chuẩn: 2 m". */
export function referenceLabel(reference: MeasureReference, scale: MeasureScale): string {
  return translate('image:file.measureReference', { length: formatLength(distance(reference.points[0], reference.points[1]), scale) })
}

/** Chỗ đặt nhãn của một hình (toạ độ ảnh). */
export function labelAnchor(shape: MeasureShape): Point {
  if (shape.kind === 'distance') return midpoint(shape.points[0], shape.points[1])
  if (shape.kind === 'area') return centerOf(shape.points)
  return shape.points[0]
}

export interface MeasureSummary {
  distances: number
  areas: number
  counts: number
}

export function summarize(shapes: MeasureShape[]): MeasureSummary {
  return {
    distances: shapes.filter((shape) => shape.kind === 'distance').length,
    areas: shapes.filter((shape) => shape.kind === 'area').length,
    counts: shapes.filter((shape) => shape.kind === 'count').length,
  }
}
