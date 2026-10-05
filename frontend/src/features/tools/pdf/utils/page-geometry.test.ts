import { describe, expect, it } from 'vitest'
import {
  baseToVisual,
  baseToVisualMatrix,
  normalizeRotation,
  textStart,
  turnAxes,
  userAngle,
  userToVisual,
  visualSize,
  visualRectToBase,
  visualToBase,
  visualToUser,
  type PageBox,
  type QuarterTurn,
} from './page-geometry'

const A4: PageBox = { x: 0, y: 0, width: 595, height: 842 }

describe('normalizeRotation', () => {
  it('wraps negatives and full turns', () => {
    expect(normalizeRotation(-90)).toBe(270)
    expect(normalizeRotation(450)).toBe(90)
    expect(normalizeRotation(360)).toBe(0)
  })
})

describe('visualSize', () => {
  it('swaps sides on quarter turns', () => {
    expect(visualSize(A4, 90)).toEqual({ width: 842, height: 595 })
    expect(visualSize(A4, 180)).toEqual({ width: 595, height: 842 })
  })
})

describe('visualToUser', () => {
  it('flips y on an upright page', () => {
    expect(visualToUser({ x: 10, y: 20 }, A4, 0)).toEqual({ x: 10, y: 822 })
  })

  // Góc trên-trái người đọc thấy là góc nào của trang gốc sau mỗi lần xoay.
  it('maps the visible top-left corner for every rotation', () => {
    expect(visualToUser({ x: 0, y: 0 }, A4, 90)).toEqual({ x: 0, y: 0 })
    expect(visualToUser({ x: 0, y: 0 }, A4, 180)).toEqual({ x: 595, y: 0 })
    expect(visualToUser({ x: 0, y: 0 }, A4, 270)).toEqual({ x: 595, y: 842 })
  })

  it('maps the visible bottom-right corner for every rotation', () => {
    const corner = (rotation: 0 | 90 | 180 | 270) => {
      const size = visualSize(A4, rotation)
      return visualToUser({ x: size.width, y: size.height }, A4, rotation)
    }
    expect(corner(0)).toEqual({ x: 595, y: 0 })
    expect(corner(90)).toEqual({ x: 595, y: 842 })
    expect(corner(180)).toEqual({ x: 0, y: 842 })
    expect(corner(270)).toEqual({ x: 0, y: 0 })
  })

  it('adds the crop box origin', () => {
    const cropped: PageBox = { x: 36, y: 50, width: 500, height: 700 }
    expect(visualToUser({ x: 0, y: 0 }, cropped, 0)).toEqual({ x: 36, y: 750 })
  })
})

describe('userToVisual', () => {
  it('undoes visualToUser for every rotation, crop box offset included', () => {
    const cropped: PageBox = { x: 36, y: 50, width: 500, height: 700 }
    for (const rotation of [0, 90, 180, 270] as const) {
      const point = { x: 120, y: 340 }
      expect(userToVisual(visualToUser(point, cropped, rotation), cropped, rotation)).toEqual(point)
    }
  })
})

describe('userAngle', () => {
  it('adds the page rotation', () => {
    expect(userAngle(0, 90)).toBe(90)
    expect(userAngle(45, 270)).toBe(315)
    expect(userAngle(-45, 0)).toBe(315)
  })
})

describe('textStart', () => {
  it('aligns horizontal text', () => {
    expect(textStart({ x: 100, y: 50 }, 40, 'start', 0)).toEqual({ x: 100, y: 50 })
    expect(textStart({ x: 100, y: 50 }, 40, 'middle', 0)).toEqual({ x: 80, y: 50 })
    expect(textStart({ x: 100, y: 50 }, 40, 'end', 0)).toEqual({ x: 60, y: 50 })
  })

  it('walks back along a 90° line (text reading upwards)', () => {
    const start = textStart({ x: 100, y: 100 }, 40, 'middle', 90)
    expect(start.x).toBeCloseTo(100)
    expect(start.y).toBeCloseTo(120)
  })

  it('shifts the baseline downwards relative to the text', () => {
    const start = textStart({ x: 100, y: 100 }, 0, 'middle', 0, 10)
    expect(start).toEqual({ x: 100, y: 110 })
  })
})

describe('visualRectToBase', () => {
  it('maps a rectangle drawn on a rotated page back to the unrotated frame', () => {
    // Base 600×800 turned 90° shows as 800×600; the top-left visual strip is the left base strip.
    const rect = visualRectToBase({ x: 0, y: 0, width: 100, height: 600 }, { width: 800, height: 600 }, 90)
    expect(rect).toEqual({ x: 0, y: 700, width: 600, height: 100 })
    expect(visualRectToBase({ x: 10, y: 20, width: 30, height: 40 }, { width: 600, height: 800 }, 0)).toEqual({ x: 10, y: 20, width: 30, height: 40 })
  })
})

describe('baseToVisual / visualToBase', () => {
  const base = { width: 600, height: 800 }
  const turns: QuarterTurn[] = [0, 90, 180, 270]

  it('moves the base top-left corner clockwise', () => {
    expect(baseToVisual({ x: 0, y: 0 }, base, 90)).toEqual({ x: 800, y: 0 })
    expect(baseToVisual({ x: 0, y: 0 }, base, 180)).toEqual({ x: 600, y: 800 })
    expect(baseToVisual({ x: 0, y: 0 }, base, 270)).toEqual({ x: 0, y: 600 })
  })

  it('round-trips and agrees with the SVG matrix', () => {
    const point = { x: 120, y: 45 }
    for (const turn of turns) {
      const visual = baseToVisual(point, base, turn)
      expect(visualToBase(visual, base, turn)).toEqual(point)
      const [a, b, c, d, e, f] = baseToVisualMatrix(base, turn)
      expect({ x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f }).toEqual(visual)
    }
  })

  it('points the rotated x axis where the visible x axis lands', () => {
    for (const turn of turns) {
      const { x: axis } = turnAxes(turn)
      const origin = visualToBase({ x: 10, y: 10 }, base, turn)
      const step = visualToBase({ x: 11, y: 10 }, base, turn)
      expect({ x: step.x - origin.x, y: step.y - origin.y }).toEqual(axis)
    }
  })
})
