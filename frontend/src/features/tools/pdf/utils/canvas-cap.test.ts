import { describe, expect, it } from 'vitest'
import { CANVAS_CAP, fitScale } from './canvas-cap'

const A4 = { width: 595.28, height: 841.89 }
const A0 = { width: 3370.39, height: 2383.94 }

describe('fitScale', () => {
  it('giữ nguyên tỉ lệ khi canvas còn trong trần', () => {
    expect(fitScale(A4, 300 / 72)).toBe(300 / 72)
  })

  it('A0 ở 300 DPI bị hạ cho vừa trần diện tích', () => {
    const scale = fitScale(A0, 300 / 72)
    const area = A0.width * scale * A0.height * scale
    expect(area).toBeLessThanOrEqual(CANVAS_CAP.maxArea + 1)
    expect(area).toBeGreaterThan(CANVAS_CAP.maxArea * 0.99)
    expect(Math.round(scale * 72)).toBe(102)
  })

  it('trang rất dài bị chặn theo cạnh trước khi chạm trần diện tích', () => {
    const strip = { width: 200, height: 20000 }
    const scale = fitScale(strip, 2)
    expect(strip.height * scale).toBeCloseTo(CANVAS_CAP.maxSide)
  })

  it('khung rỗng không chia cho 0', () => {
    expect(fitScale({ width: 0, height: 0 }, 2)).toBe(2)
  })
})
