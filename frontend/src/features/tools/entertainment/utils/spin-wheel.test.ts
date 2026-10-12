import { describe, expect, it } from 'vitest'
import { angleFromTransform, bordersCrossed, forwardDelta, parseOptions, randomFraction, randomIndex, sliceAtPointer, spinTarget, WHEEL_LIMITS } from './spin-wheel'
import { MAX_SAVED_LISTS, parseWheelLists, saveWheelList, type WheelList } from '../services/wheel-lists.store'

describe('parseOptions', () => {
  it('keeps one option per line, dropping blanks and case-insensitive duplicates', () => {
    expect(parseOptions('  Phở \n\n bún   chả\nphở\r\nBánh mì\n').options).toEqual(['Phở', 'bún chả', 'Bánh mì'])
  })

  it('caps the number of options and flags the overflow', () => {
    const lines = Array.from({ length: WHEEL_LIMITS.maxOptions + 3 }, (_, index) => `Option ${index}`)
    const parsed = parseOptions(lines.join('\n'))
    expect(parsed.options).toHaveLength(WHEEL_LIMITS.maxOptions)
    expect(parsed.overLimit).toBe(true)
  })

  it('does not count a trailing duplicate as overflow', () => {
    const lines = Array.from({ length: WHEEL_LIMITS.maxOptions }, (_, index) => `Option ${index}`)
    expect(parseOptions([...lines, 'option 0'].join('\n')).overLimit).toBe(false)
  })

  it('cuts long options and flags it', () => {
    const parsed = parseOptions('x'.repeat(WHEEL_LIMITS.maxLength + 10))
    expect(parsed.options[0]).toHaveLength(WHEEL_LIMITS.maxLength)
    expect(parsed.clipped).toBe(true)
  })
})

describe('randomIndex', () => {
  it('rejects values in the biased tail instead of folding them with modulo', () => {
    const values = [2 ** 32 - 1, 7]
    expect(randomIndex(3, () => values.shift()!)).toBe(1)
  })

  it('stays within range with the real crypto source', () => {
    for (let count = 1; count <= WHEEL_LIMITS.maxOptions; count += 1) {
      const index = randomIndex(count)
      expect(index).toBeGreaterThanOrEqual(0)
      expect(index).toBeLessThan(count)
    }
  })

  it('refuses an empty wheel', () => {
    expect(() => randomIndex(0)).toThrow(RangeError)
  })

  it('returns fractions in [0, 1)', () => {
    expect(randomFraction(() => 0)).toBe(0)
    expect(randomFraction(() => 2 ** 32 - 1)).toBeLessThan(1)
  })
})

describe('spinTarget', () => {
  it('lands the chosen slice under the pointer from any starting rotation', () => {
    for (const count of [2, 3, 7, 30]) {
      for (const current of [0, 123.4, 3725, 99_999.9]) {
        for (let index = 0; index < count; index += 1) {
          const target = spinTarget(current, index, count, 6, 0.4)
          expect(sliceAtPointer(target, count)).toBe(index)
          expect(target).toBeGreaterThanOrEqual(current + 6 * 360)
          expect(target).toBeLessThan(current + 7 * 360)
        }
      }
    }
  })
})

describe('tick tracking', () => {
  it('reads the rotation back from a computed matrix', () => {
    const matrix = (deg: number) => {
      const rad = (deg * Math.PI) / 180
      return `matrix(${Math.cos(rad)}, ${Math.sin(rad)}, ${-Math.sin(rad)}, ${Math.cos(rad)}, 0, 0)`
    }
    for (const deg of [0, 45, 179, 181, 359]) expect(angleFromTransform(matrix(deg))).toBeCloseTo(deg, 6)
    expect(angleFromTransform('none')).toBeNull()
  })

  it('unwraps travel across the 0/360 seam', () => {
    expect(forwardDelta(350, 10)).toBe(20)
    expect(forwardDelta(10, 40)).toBe(30)
  })

  it('counts each slice border passed once', () => {
    expect(bordersCrossed(0, 89, 4)).toBe(0)
    expect(bordersCrossed(89, 91, 4)).toBe(1)
    expect(bordersCrossed(10, 370, 4)).toBe(4)
    expect(bordersCrossed(0, 6 * 360, 30)).toBe(180)
  })
})

describe('wheel lists storage', () => {
  const list = (name: string): WheelList => ({ id: name, name, options: ['A', 'B'], savedAt: 1 })

  it('survives corrupt or foreign data', () => {
    expect(parseWheelLists(null)).toEqual([])
    expect(parseWheelLists('{not json')).toEqual([])
    expect(parseWheelLists('{"a":1}')).toEqual([])
    expect(parseWheelLists(JSON.stringify([list('Trưa'), { id: 1 }, { ...list(''), name: ' ' }]))).toEqual([list('Trưa')])
  })

  it('overwrites a list saved under the same name instead of duplicating it', () => {
    const outcome = saveWheelList([list('Khác'), list('Ăn trưa')], ' ăn  TRƯA ', ['X', 'Y'], 5)
    expect(outcome.kind).toBe('replaced')
    if (outcome.kind === 'full') return
    expect(outcome.lists.map((item) => item.name)).toEqual(['ăn TRƯA', 'Khác'])
    expect(outcome.lists[0]).toMatchObject({ id: 'Ăn trưa', options: ['X', 'Y'], savedAt: 5 })
  })

  it('refuses a new name once the shelf is full', () => {
    const full = Array.from({ length: MAX_SAVED_LISTS }, (_, index) => list(`List ${index}`))
    expect(saveWheelList(full, 'Mới', ['A', 'B'], 1).kind).toBe('full')
    expect(saveWheelList(full, 'list 3', ['A', 'B'], 1).kind).toBe('replaced')
  })
})
