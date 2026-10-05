import { describe, expect, it } from 'vitest'
import { adjustFilter, adjustLut, applyLut, isNeutral } from './adjust'

describe('adjustLut', () => {
  it('hệ số 1 giữ nguyên mọi mức', () => {
    const lut = adjustLut({ brightness: 1, contrast: 1 })
    expect(Array.from(lut)).toEqual(Array.from({ length: 256 }, (_, level) => level))
  })

  it('độ sáng nhân thẳng vào mức xám, kẹp ở trắng', () => {
    const lut = adjustLut({ brightness: 1.5, contrast: 1 })
    expect(lut[100]).toBe(150)
    expect(lut[200]).toBe(255)
    expect(lut[0]).toBe(0)
  })

  it('tương phản xoay quanh xám giữa', () => {
    const lut = adjustLut({ brightness: 1, contrast: 1.5 })
    expect(lut[128]).toBe(128)
    expect(lut[64]).toBeLessThan(64)
    expect(lut[192]).toBeGreaterThan(192)
    expect(lut[10]).toBe(0)
    expect(lut[250]).toBe(255)
  })

  it('sáng trước rồi mới tương phản, kẹp giữa hai bước', () => {
    // 200 × 1.5 kẹp về 255 TRƯỚC khi giảm tương phản: (1 − 0.5) × 0.5 + 0.5 = 0.75.
    expect(adjustLut({ brightness: 1.5, contrast: 0.5 })[200]).toBe(191)
  })
})

describe('applyLut', () => {
  it('đổi ba kênh màu, giữ kênh alpha', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 77, 40, 50, 60, 0])
    applyLut(data, adjustLut({ brightness: 2, contrast: 1 }))
    expect(Array.from(data)).toEqual([20, 40, 60, 77, 80, 100, 120, 0])
  })
})

describe('adjustFilter', () => {
  it('không chỉnh gì thì không gắn filter', () => {
    expect(isNeutral({ brightness: 1, contrast: 1 })).toBe(true)
    expect(adjustFilter({ brightness: 1, contrast: 1 })).toBe('none')
    expect(adjustFilter({ brightness: 1.2, contrast: 0.9 })).toBe('brightness(1.2) contrast(0.9)')
  })
})
