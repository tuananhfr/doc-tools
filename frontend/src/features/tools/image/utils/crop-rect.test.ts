import { describe, expect, it } from 'vitest'
import { fullRect, isFullRect, moveRect, rectForAspect, resizeRect, rotateRect, rotatedSize, snapRect } from './crop-rect'

const bounds = { width: 1000, height: 800 }
const rect = { x: 100, y: 100, width: 400, height: 300 }

describe('moveRect', () => {
  it('dời trong ảnh', () => {
    expect(moveRect(rect, 50, -20, bounds)).toEqual({ x: 150, y: 80, width: 400, height: 300 })
  })

  it('không ra ngoài mép ảnh', () => {
    expect(moveRect(rect, 5000, 5000, bounds)).toEqual({ x: 600, y: 500, width: 400, height: 300 })
    expect(moveRect(rect, -5000, -5000, bounds)).toEqual({ x: 0, y: 0, width: 400, height: 300 })
  })
})

describe('resizeRect — tự do', () => {
  it('kéo góc dưới-phải, góc trên-trái đứng yên', () => {
    expect(resizeRect(rect, 'se', 100, 50, bounds, null)).toEqual({ x: 100, y: 100, width: 500, height: 350 })
  })

  it('kéo góc trên-trái, góc dưới-phải đứng yên', () => {
    expect(resizeRect(rect, 'nw', -50, 20, bounds, null)).toEqual({ x: 50, y: 120, width: 450, height: 280 })
  })

  it('kéo cạnh chỉ đổi một chiều', () => {
    expect(resizeRect(rect, 'e', 100, 999, bounds, null)).toEqual({ x: 100, y: 100, width: 500, height: 300 })
  })

  it('dừng ở mép ảnh và ở cỡ nhỏ nhất', () => {
    expect(resizeRect(rect, 'se', 9000, 9000, bounds, null)).toEqual({ x: 100, y: 100, width: 900, height: 700 })
    expect(resizeRect(rect, 'se', -9000, -9000, bounds, null)).toEqual({ x: 100, y: 100, width: 16, height: 16 })
    expect(resizeRect(rect, 'nw', 9000, 9000, bounds, null)).toEqual({ x: 484, y: 384, width: 16, height: 16 })
  })
})

describe('resizeRect — khoá tỉ lệ', () => {
  const square = { x: 100, y: 100, width: 300, height: 300 }

  it('kéo góc: chiều kia chạy theo, góc đối đứng yên', () => {
    expect(resizeRect(square, 'se', 100, 0, bounds, 1)).toEqual({ x: 100, y: 100, width: 400, height: 400 })
    expect(resizeRect(square, 'nw', -50, 0, bounds, 1)).toEqual({ x: 50, y: 50, width: 350, height: 350 })
  })

  it('kéo góc theo một chiều vẫn thu nhỏ được (phím mũi tên)', () => {
    expect(resizeRect(square, 'se', -100, 0, bounds, 1)).toEqual({ x: 100, y: 100, width: 200, height: 200 })
    expect(resizeRect(square, 'se', 0, -60, bounds, 1)).toEqual({ x: 100, y: 100, width: 240, height: 240 })
    expect(resizeRect(square, 'nw', 0, 50, bounds, 1)).toEqual({ x: 150, y: 150, width: 250, height: 250 })
  })

  it('kéo cạnh: khung cân quanh trục giữa', () => {
    expect(resizeRect(square, 'e', 100, 0, bounds, 1)).toEqual({ x: 100, y: 50, width: 400, height: 400 })
    expect(resizeRect(square, 's', 0, 100, bounds, 1)).toEqual({ x: 50, y: 100, width: 400, height: 400 })
  })

  it('hết chỗ thì co cả hai chiều, vẫn đúng tỉ lệ và nằm trong ảnh', () => {
    const result = resizeRect(square, 'se', 9000, 9000, bounds, 1)
    expect(result).toEqual({ x: 100, y: 100, width: 700, height: 700 })
    const wide = resizeRect({ x: 0, y: 300, width: 320, height: 180 }, 'e', 9000, 0, bounds, 16 / 9)
    expect(wide.width / wide.height).toBeCloseTo(16 / 9)
    expect(wide.x).toBe(0)
    expect(wide.y).toBeGreaterThanOrEqual(0)
    expect(wide.y + wide.height).toBeLessThanOrEqual(bounds.height)
  })
})

describe('rectForAspect', () => {
  it('khung lớn nhất đúng tỉ lệ, nằm giữa', () => {
    expect(rectForAspect(bounds, 1)).toEqual({ x: 100, y: 0, width: 800, height: 800 })
    expect(rectForAspect(bounds, 2)).toEqual({ x: 0, y: 150, width: 1000, height: 500 })
  })
})

describe('rotateRect', () => {
  it('xoay phải rồi xoay trái về đúng chỗ cũ', () => {
    const turned = rotateRect(rect, bounds, 'cw')
    expect(turned).toEqual({ x: 400, y: 100, width: 300, height: 400 })
    expect(rotateRect(turned, rotatedSize(bounds, 90), 'ccw')).toEqual(rect)
  })

  it('bốn lần xoay phải là một vòng', () => {
    let current = rect
    let size = bounds
    for (let turn = 0; turn < 4; turn++) {
      current = rotateRect(current, size, 'cw')
      size = rotatedSize(size, 90)
    }
    expect(current).toEqual(rect)
  })
})

describe('snapRect / fullRect', () => {
  it('làm tròn về điểm ảnh nguyên, không tràn ảnh', () => {
    expect(snapRect({ x: 10.4, y: 20.6, width: 989.9, height: 779.9 }, bounds)).toEqual({ x: 10, y: 21, width: 990, height: 779 })
  })

  it('nhận ra khung trùm cả ảnh', () => {
    expect(isFullRect(fullRect(bounds), bounds)).toBe(true)
    expect(isFullRect(rect, bounds)).toBe(false)
  })
})
