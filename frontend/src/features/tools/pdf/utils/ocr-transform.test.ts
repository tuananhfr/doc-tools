import { describe, expect, it } from 'vitest'
import { expandedRotation, IDENTITY, invertMatrix, transformPoint } from './ocr-transform'
import { perspectiveMatrix, validPaperCorners } from './ocr-perspective'
import type { Quad } from '../types/text-layer.types'

describe('OCR coordinates', () => {
  it('keeps every corner inside an expanded deskew canvas and round-trips it', () => {
    for (const angle of [-5, 4, 90]) {
      const rotation = expandedRotation(1200, 760, angle)
      for (const point of [{ x: 0, y: 0 }, { x: 1200, y: 0 }, { x: 1200, y: 760 }, { x: 0, y: 760 }]) {
        const transformed = transformPoint(rotation.fromOriginal, point)
        expect(transformed.x).toBeGreaterThanOrEqual(-1e-7)
        expect(transformed.x).toBeLessThanOrEqual(rotation.width + 1e-7)
        expect(transformed.y).toBeGreaterThanOrEqual(-1e-7)
        expect(transformed.y).toBeLessThanOrEqual(rotation.height + 1e-7)
        const original = transformPoint(rotation.toOriginal, transformed)
        expect(original.x).toBeCloseTo(point.x, 7)
        expect(original.y).toBeCloseTo(point.y, 7)
      }
    }
  })
  it('maps perspective corners and an interior point back to the original', () => {
    const from: Quad = [{ x: 80, y: 40 }, { x: 950, y: 100 }, { x: 900, y: 730 }, { x: 20, y: 700 }]
    const to: Quad = [{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 1000, y: 800 }, { x: 0, y: 800 }]
    const matrix = perspectiveMatrix(from, to)
    from.forEach((point, index) => {
      const result = transformPoint(matrix, point)
      expect(result.x).toBeCloseTo(to[index].x, 6)
      expect(result.y).toBeCloseTo(to[index].y, 6)
    })
    const point = { x: 350, y: 500 }
    const result = transformPoint(invertMatrix(matrix), transformPoint(matrix, point))
    expect(result.x).toBeCloseTo(point.x, 6)
    expect(result.y).toBeCloseTo(point.y, 6)
    expect(validPaperCorners(from, 1000, 800)).toBe(true)
    expect(validPaperCorners([from[0], from[2], from[1], from[3]], 1000, 800)).toBe(false)
  })
  it('rejects singular transforms', () => {
    expect(transformPoint(IDENTITY, { x: 2, y: 3 })).toEqual({ x: 2, y: 3 })
    expect(() => invertMatrix([0, 0, 0, 0, 0, 0, 0, 0, 0])).toThrow('OCR_INVALID_TRANSFORM')
  })
})
