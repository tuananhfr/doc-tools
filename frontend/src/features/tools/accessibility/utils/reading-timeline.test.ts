import { describe, expect, it } from 'vitest'
import { rangeAt, remainingAt } from './reading-timeline'

describe('rangeAt', () => {
  const entries = [{ startAt: 1, start: 0, end: 10 }, { startAt: 4, start: 11, end: 20 }]
  it('picks the latest started chunk, keeping it through the gap', () => {
    expect(rangeAt(entries, 0.5)).toBeNull()
    expect(rangeAt(entries, 3.9)?.start).toBe(0)
    expect(rangeAt(entries, 4)?.start).toBe(11)
    expect(rangeAt([...entries, { startAt: 2, start: 30, end: 40 }], 5)?.start).toBe(11)
  })
})

describe('remainingAt', () => {
  it('drops finished audio and cuts the playing one at the heard sample', () => {
    const items = [
      { startAt: 0, duration: 1, from: 0, length: 100 },
      { startAt: 1, duration: 2, from: 40, length: 240 },
      { startAt: 3, duration: 1, from: 0, length: 50 },
    ]
    expect(remainingAt(items, 2).map(({ from }) => from)).toEqual([140, 0])
    expect(remainingAt(items, 5)).toEqual([])
  })
})
