import { describe, expect, it } from 'vitest'
import { initialCrop, isPristine, turned, withAspect } from './crop-state'

const size = { width: 1000, height: 800 }

describe('crop-state', () => {
  it('ảnh vừa mở là chưa chỉnh gì', () => {
    expect(isPristine(initialCrop(size), size)).toBe(true)
  })

  it('cắt, xoay hoặc chỉnh sáng đều tính là đã chỉnh', () => {
    const base = initialCrop(size)
    expect(isPristine({ ...base, rect: { x: 0, y: 0, width: 500, height: 800 } }, size)).toBe(false)
    expect(isPristine({ ...base, brightness: 1.1 }, size)).toBe(false)
    expect(isPristine(turned(base, size, 'cw'), size)).toBe(false)
  })

  it('chọn tỉ lệ: khung lớn nhất đúng tỉ lệ; về "tự do" thì giữ khung', () => {
    const square = withAspect(initialCrop(size), size, '1:1')
    expect(square.rect).toEqual({ x: 100, y: 0, width: 800, height: 800 })
    expect(withAspect(square, size, 'free').rect).toEqual(square.rect)
  })

  it('xoay: khung và tỉ lệ đi theo ảnh', () => {
    const wide = withAspect(initialCrop(size), size, '16:9')
    const after = turned(wide, size, 'cw')
    expect(after.rotation).toBe(90)
    expect(after.aspect).toBe('9:16')
    expect(after.rect.width).toBeCloseTo(wide.rect.height)
    expect(after.rect.height).toBeCloseTo(wide.rect.width)
    // Ảnh sau khi xoay là 800 × 1000: khung phải nằm trọn trong đó.
    expect(after.rect.x + after.rect.width).toBeLessThanOrEqual(800)
    expect(after.rect.y + after.rect.height).toBeLessThanOrEqual(1000)
  })

  it('bốn lần xoay phải về lại ban đầu; xoay trái là 270°', () => {
    let state = withAspect(initialCrop(size), size, '4:3')
    const start = state
    for (let turn = 0; turn < 4; turn++) state = turned(state, size, 'cw')
    expect(state.rotation).toBe(0)
    expect(state.aspect).toBe('4:3')
    expect(state.rect.x).toBeCloseTo(start.rect.x)
    expect(state.rect.width).toBeCloseTo(start.rect.width)
    expect(turned(start, size, 'ccw').rotation).toBe(270)
  })

  it('chọn tỉ lệ trên ảnh đã xoay tính theo kích thước sau xoay', () => {
    const state = withAspect(turned(initialCrop(size), size, 'cw'), size, '1:1')
    expect(state.rect).toEqual({ x: 0, y: 100, width: 800, height: 800 })
  })
})
