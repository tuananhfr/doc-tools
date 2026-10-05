import { describe, expect, it } from 'vitest'
import { hasMarks, INITIAL_MARK, stampFit, stampFontSize, stampMargin, stampOrigin, tileCenters } from './mark'

const image = { width: 4000, height: 3000 }

describe('hasMarks', () => {
  it('chưa vẽ gì thì không có gì để ghi', () => {
    expect(hasMarks(INITIAL_MARK)).toBe(false)
    expect(hasMarks({ ...INITIAL_MARK, stamp: { ...INITIAL_MARK.stamp, text: '   ' } })).toBe(false)
  })

  it('một khung che hoặc một dòng chữ là đủ', () => {
    expect(hasMarks({ ...INITIAL_MARK, boxes: [{ x: 0, y: 0, width: 10, height: 10 }] })).toBe(true)
    expect(hasMarks({ ...INITIAL_MARK, stamp: { ...INITIAL_MARK.stamp, text: 'BẢN NHÁP' } })).toBe(true)
  })
})

describe('cỡ chữ và lề', () => {
  it('theo cạnh ngắn, nên ảnh dọc và ảnh ngang cùng cỡ ra cùng chữ', () => {
    expect(stampFontSize(image, 0.05)).toBe(150)
    expect(stampFontSize({ width: 3000, height: 4000 }, 0.05)).toBe(150)
    expect(stampFontSize({ width: 40, height: 40 }, 0.05)).toBe(8)
    expect(stampMargin(150)).toBe(90)
  })
})

describe('stampFit', () => {
  it('chữ vừa thì giữ cỡ, chữ dài thì thu cho gọn trong lề', () => {
    expect(stampFit(image, 1000, 90)).toBe(1)
    expect(stampFit(image, 7640, 90)).toBeCloseTo(0.5, 10)
    expect(stampFit(image, 0, 90)).toBe(1)
  })
})

describe('stampOrigin', () => {
  const text = { width: 1000, height: 150 }

  it('neo vào chín vị trí, cách mép đúng một lề', () => {
    expect(stampOrigin(image, text, 'topLeft', 90)).toEqual({ x: 90, y: 90 })
    expect(stampOrigin(image, text, 'bottomRight', 90)).toEqual({ x: 2910, y: 2760 })
    expect(stampOrigin(image, text, 'center', 90)).toEqual({ x: 1500, y: 1425 })
    expect(stampOrigin(image, text, 'topCenter', 90)).toEqual({ x: 1500, y: 90 })
  })

  it('chữ to hơn chỗ trống thì dính lề trái / trên chứ không ra toạ độ âm', () => {
    expect(stampOrigin({ width: 500, height: 100 }, text, 'bottomRight', 90)).toEqual({ x: 90, y: 90 })
  })
})

describe('tileCenters', () => {
  it('phủ quá bốn góc ảnh và so le hàng lẻ', () => {
    const text = { width: 600, height: 100 }
    const centers = tileCenters(image, text)
    const radius = Math.hypot(image.width, image.height) / 2
    expect(Math.max(...centers.map((point) => point.x))).toBeGreaterThanOrEqual(radius)
    expect(Math.min(...centers.map((point) => point.x))).toBeLessThanOrEqual(-radius)
    expect(Math.max(...centers.map((point) => point.y))).toBeGreaterThanOrEqual(radius)
    expect(centers.some((point) => point.x === 0 && point.y === 0)).toBe(true)
    expect(centers.some((point) => point.y === 400 && point.x === 450)).toBe(true)
  })

  it('không lặp vô hạn với chữ rỗng', () => {
    expect(tileCenters(image, { width: 0, height: 0 })).toEqual([])
  })
})
