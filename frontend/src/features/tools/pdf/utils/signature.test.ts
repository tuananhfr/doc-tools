import { describe, expect, it } from 'vitest'
import { SIGNATURE_PAD, strokeBounds, strokePath } from './signature'

describe('strokePath', () => {
  it('returns nothing for an empty stroke', () => {
    expect(strokePath([])).toBe('')
  })

  it('draws a single tap as a zero-length segment so round caps make a dot', () => {
    expect(strokePath([{ x: 10, y: 20 }])).toBe('M10 20L10 20')
  })

  it('joins two points with a straight line', () => {
    expect(strokePath([{ x: 0, y: 0 }, { x: 10, y: 5 }])).toBe('M0 0L10 5')
  })

  it('curves through the midpoints of the inner segments', () => {
    expect(
      strokePath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 20, y: 10 },
        { x: 30, y: 10 },
      ]),
    ).toBe('M0 0Q10 0 15 5Q20 10 25 10L30 10')
  })
})

describe('strokeBounds', () => {
  it('has no bounds before the first stroke', () => {
    expect(strokeBounds([])).toBeNull()
    expect(strokeBounds([[]])).toBeNull()
  })

  it('wraps every stroke with room for the stroke width', () => {
    const bounds = strokeBounds(
      [
        [
          { x: 100, y: 50 },
          { x: 200, y: 80 },
        ],
        [{ x: 150, y: 120 }],
      ],
      4,
    )
    expect(bounds).toEqual({ x: 94.25, y: 44.25, width: 111.5, height: 81.5 })
  })

  it('never leaves the pad', () => {
    const bounds = strokeBounds([
      [
        { x: 0, y: 0 },
        { x: SIGNATURE_PAD.width, y: SIGNATURE_PAD.height },
      ],
    ])
    expect(bounds).toEqual({ x: 0, y: 0, width: SIGNATURE_PAD.width, height: SIGNATURE_PAD.height })
  })
})
