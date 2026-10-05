import { describe, expect, it } from 'vitest'
import type { Anchor, OrientationTarget } from '../types/orientation.types'
import { axisAngle, directionOf, formatDeg, imageNorth, normalizeDeg, pointAt, targetAzimuth } from './azimuth'

const axis = (fromX: number, fromY: number, toX: number, toY: number) => ({ from: { x: fromX, y: fromY }, to: { x: toX, y: toY } })

describe('normalizeDeg', () => {
  it('đưa góc âm và góc quá một vòng về [0, 360) — ORI-002', () => {
    expect(normalizeDeg(-10)).toBe(350)
    expect(normalizeDeg(360)).toBe(0)
    expect(normalizeDeg(725)).toBe(5)
    expect(normalizeDeg(-360)).toBe(0)
    expect(Object.is(normalizeDeg(-0), 0)).toBe(true)
  })
})

describe('directionOf', () => {
  it('132° là Đông Nam — ORI-001', () => {
    expect(directionOf(132)).toMatchObject({ name: 'Đông Nam', short: 'ĐN', index: 3 })
  })

  it('cung Bắc trùm qua 0°, ranh giới thuộc cung kế tiếp', () => {
    expect(directionOf(350).name).toBe('Bắc')
    expect(directionOf(22.49).name).toBe('Bắc')
    expect(directionOf(22.5).name).toBe('Đông Bắc')
    expect(directionOf(337.5).name).toBe('Bắc')
    expect(directionOf(337.49).name).toBe('Tây Bắc')
  })

  it('16 cung', () => {
    expect(directionOf(132, 16).name).toBe('Đông Nam')
    expect(directionOf(120, 16).name).toBe('Đông Đông Nam')
    expect(directionOf(11.25, 16).name).toBe('Bắc Đông Bắc')
    expect(directionOf(-10, 16).name).toBe('Bắc')
  })
})

describe('formatDeg', () => {
  it('một chữ số thập phân, dấu phẩy, 359,96 ra 0', () => {
    expect(formatDeg(132)).toBe('132°')
    expect(formatDeg(132.46)).toBe('132,5°')
    expect(formatDeg(359.96)).toBe('0°')
  })
})

describe('axisAngle', () => {
  it('đo theo chiều kim đồng hồ từ phía trên ảnh (y hướng xuống)', () => {
    expect(axisAngle(axis(0, 0, 0, -1))).toBe(0)
    expect(axisAngle(axis(0, 0, 1, 0))).toBe(90)
    expect(axisAngle(axis(0, 0, 0, 1))).toBe(180)
    expect(axisAngle(axis(0, 0, -1, 0))).toBe(270)
    expect(axisAngle(axis(5, 5, 5, 5))).toBeNull()
  })

  it('pointAt là nghịch đảo của axisAngle', () => {
    const end = pointAt({ x: 10, y: 10 }, 132, 50)
    expect(axisAngle({ from: { x: 10, y: 10 }, to: end })).toBeCloseTo(132, 9)
  })
})

describe('imageNorth / targetAzimuth', () => {
  const front: OrientationTarget = { id: 'a', type: 'HOUSE_FRONTAGE', axis: axis(0, 0, 0, 1) } // chĩa xuống ảnh
  const door: OrientationTarget = { id: 'b', type: 'MAIN_DOOR', axis: axis(0, 0, 1, 0) } // chĩa sang phải
  const kitchen: OrientationTarget = { id: 'c', type: 'KITCHEN', axis: null }

  it('mũi tên Bắc trên bản vẽ: tái lập được — ORI-003', () => {
    // Bắc của bản vẽ chĩa sang phải ảnh (90°) → mặt tiền chĩa xuống (180°) là 90° = Đông.
    const anchor: Anchor = { source: 'DRAWING', northAxis: axis(0, 0, 1, 0) }
    expect(imageNorth(anchor, [front])).toBe(90)
    expect(targetAzimuth(front, anchor, [front])).toBe(90)
    expect(targetAzimuth(front, anchor, [front])).toBe(targetAzimuth(front, anchor, [front]))
  })

  it('nhiều đối tượng dùng chung mốc nhưng trục độc lập — ORI-007', () => {
    const anchor: Anchor = { source: 'DRAWING', northAxis: axis(0, 0, 0, -1) }
    const targets = [front, door, kitchen]
    expect(targetAzimuth(front, anchor, targets)).toBe(180)
    expect(targetAzimuth(door, anchor, targets)).toBe(90)
    expect(targetAzimuth(kitchen, anchor, targets)).toBeNull()
  })

  it('số độ đã biết của một đối tượng có trục → suy ra các đối tượng khác', () => {
    const anchor: Anchor = { source: 'MANUAL', azimuth: 132, targetId: 'a', accuracy: null }
    const targets = [front, door]
    expect(targetAzimuth(front, anchor, targets)).toBe(132)
    // Cửa lệch mặt tiền -90° trên ảnh → 132 - 90 = 42°.
    expect(targetAzimuth(door, anchor, targets)).toBe(42)
    expect(imageNorth(anchor, targets)).toBe(48)
  })

  it('số độ đã biết mà đối tượng chưa có trục: không đặt được la bàn lên ảnh, không bịa hướng', () => {
    const anchor: Anchor = { source: 'DEVICE', azimuth: 200, targetId: 'c', accuracy: 15 }
    expect(imageNorth(anchor, [kitchen, door])).toBeNull()
    expect(targetAzimuth(kitchen, anchor, [kitchen, door])).toBe(200)
    expect(targetAzimuth(door, anchor, [kitchen, door])).toBeNull()
  })

  it('không có mốc thì không tính — spec §8', () => {
    expect(targetAzimuth(front, null, [front])).toBeNull()
  })
})
