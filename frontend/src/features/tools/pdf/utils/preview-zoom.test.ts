import { describe, expect, it } from 'vitest'
import { resolveZoom, stepZoom, targetPixelRatio } from './preview-zoom'

const A4 = { width: 794, height: 1123 }

describe('resolveZoom', () => {
  it('fits the whole page by the tighter side', () => {
    expect(resolveZoom('page', A4, { width: 1600, height: 800 })).toBeCloseTo(800 / 1123)
    expect(resolveZoom('page', A4, { width: 400, height: 2000 })).toBeCloseTo(400 / 794)
  })

  it('fits width regardless of height', () => {
    expect(resolveZoom('width', A4, { width: 1588, height: 300 })).toBeCloseTo(2)
  })

  it('returns fixed ratios as-is', () => {
    expect(resolveZoom(1.5, A4, { width: 10, height: 10 })).toBe(1.5)
  })

  it('falls back to 100% before the frame is measured', () => {
    expect(resolveZoom('page', A4, { width: 0, height: 0 })).toBe(1)
  })
})

describe('stepZoom', () => {
  it('moves from an odd fit ratio to the neighbouring step', () => {
    expect(stepZoom(0.83, 1)).toBe(1)
    expect(stepZoom(0.83, -1)).toBe(0.75)
  })

  it('moves off an exact step', () => {
    expect(stepZoom(1, 1)).toBe(1.25)
    expect(stepZoom(1, -1)).toBe(0.75)
  })

  it('never jumps the wrong way outside the scale', () => {
    expect(stepZoom(0.3, -1)).toBe(0.3)
    expect(stepZoom(0.3, 1)).toBe(0.5)
    expect(stepZoom(4, 1)).toBe(4)
    expect(stepZoom(5, -1)).toBe(4)
  })
})

describe('targetPixelRatio', () => {
  it('follows zoom times device pixel ratio', () => {
    expect(targetPixelRatio(1.5, 2, A4, 16_000_000)).toBe(3)
  })

  it('caps by canvas area', () => {
    const ratio = targetPixelRatio(4, 2, A4, 16_000_000)
    expect(A4.width * ratio * A4.height * ratio).toBeLessThanOrEqual(16_000_001)
  })
})
