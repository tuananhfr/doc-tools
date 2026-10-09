import { describe, expect, it } from 'vitest'
import { readNumber } from '@/features/tools/hub/utils/number-input'
import { COLLAGE_GAP_RULE, collageBlock, collageFileProblem } from './collage-input'

describe('collage input', () => {
  it('names the file-count problem', () => {
    expect(collageFileProblem(0)).toBe('none')
    expect(collageFileProblem(1)).toBe('tooFew')
    expect(collageFileProblem(2)).toBeNull()
    expect(collageFileProblem(9)).toBeNull()
    expect(collageFileProblem(10)).toBe('tooMany')
  })

  it('blames the gap only when the files are fine', () => {
    expect(collageBlock(1, null)).toBe('tooFew')
    expect(collageBlock(3, null)).toBe('gap')
    expect(collageBlock(3, 12)).toBeNull()
    expect(collageBlock(3, 0)).toBeNull()
  })

  it('reads the gap as a whole number from 0 to 100', () => {
    expect(readNumber('12', COLLAGE_GAP_RULE)).toBe(12)
    expect(readNumber('0', COLLAGE_GAP_RULE)).toBe(0)
    expect(readNumber('12,5', COLLAGE_GAP_RULE)).toBeNull()
    expect(readNumber('500', COLLAGE_GAP_RULE)).toBeNull()
    expect(readNumber('', COLLAGE_GAP_RULE)).toBeNull()
  })
})
