import { describe, expect, it } from 'vitest'
import { chunkPages, planSplit, rangeLabel } from './split-groups'

describe('rangeLabel', () => {
  it('names a single page and a span of pages', () => {
    expect(rangeLabel([3])).toBe('4')
    expect(rangeLabel([0, 1, 2])).toBe('1-3')
  })
})

describe('chunkPages', () => {
  it('cuts pages into equal groups and leaves the remainder last', () => {
    expect(chunkPages(5, 2)).toEqual([[0, 1], [2, 3], [4]])
    expect(chunkPages(3, 1)).toEqual([[0], [1], [2]])
  })
})

describe('planSplit', () => {
  it('reads page ranges', () => {
    expect(planSplit({ mode: 'ranges', ranges: '1-2, 5', every: 1 }, 6)).toEqual({ ok: true, groups: [[0, 1], [4]] })
  })

  it('asks for ranges instead of failing on an empty box', () => {
    expect(planSplit({ mode: 'ranges', ranges: '  ', every: 1 }, 6)).toEqual({ ok: false, message: 'Nhập khoảng trang cần tách.' })
  })

  it('passes a range error through', () => {
    expect(planSplit({ mode: 'ranges', ranges: '4-9', every: 1 }, 6).ok).toBe(false)
  })

  it('splits every N pages', () => {
    expect(planSplit({ mode: 'every', ranges: '', every: 4 }, 10)).toEqual({ ok: true, groups: [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]] })
  })

  it('refuses a size that would return the file unsplit', () => {
    expect(planSplit({ mode: 'every', ranges: '', every: 6 }, 6).ok).toBe(false)
    expect(planSplit({ mode: 'every', ranges: '', every: 0 }, 6).ok).toBe(false)
    expect(planSplit({ mode: 'every', ranges: '', every: 1.5 }, 6).ok).toBe(false)
  })

  it('refuses a one-page file', () => {
    expect(planSplit({ mode: 'every', ranges: '', every: 1 }, 1).ok).toBe(false)
  })
})
