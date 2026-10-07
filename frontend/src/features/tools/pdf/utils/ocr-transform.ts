import type { OcrMatrix } from '../types/ocr-profile.types'
import type { Point } from './page-geometry'
import type { Quad } from '../types/text-layer.types'

export const IDENTITY: OcrMatrix = [1, 0, 0, 0, 1, 0, 0, 0, 1]

export function transformPoint(matrix: OcrMatrix, point: Point): Point {
  const [a, b, c, d, e, f, g, h, i] = matrix
  const denominator = g * point.x + h * point.y + i
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-10) throw new Error('OCR_INVALID_TRANSFORM')
  return { x: (a * point.x + b * point.y + c) / denominator, y: (d * point.x + e * point.y + f) / denominator }
}

export const transformQuad = (matrix: OcrMatrix, quad: Quad): Quad => quad.map(point => transformPoint(matrix, point)) as Quad

export function invertMatrix(matrix: OcrMatrix): OcrMatrix {
  const [a, b, c, d, e, f, g, h, i] = matrix
  const values = [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d]
  const determinant = a * values[0] + b * values[3] + c * values[6]
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-10) throw new Error('OCR_INVALID_TRANSFORM')
  return values.map(value => value / determinant) as unknown as OcrMatrix
}

export function expandedRotation(width: number, height: number, degrees: number) {
  const angle = degrees * Math.PI / 180
  const cos = Math.cos(angle), sin = Math.sin(angle)
  const outputWidth = Math.ceil(Math.abs(width * cos) + Math.abs(height * sin))
  const outputHeight = Math.ceil(Math.abs(width * sin) + Math.abs(height * cos))
  const fromOriginal: OcrMatrix = [cos, -sin, outputWidth / 2 - cos * width / 2 + sin * height / 2, sin, cos, outputHeight / 2 - sin * width / 2 - cos * height / 2, 0, 0, 1]
  return { width: outputWidth, height: outputHeight, fromOriginal, toOriginal: invertMatrix(fromOriginal) }
}
