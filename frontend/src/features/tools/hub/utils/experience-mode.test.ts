import { describe, expect, it } from 'vitest'
import { experienceMode } from './experience-mode'

describe('experience mode', () => {
  it('defaults to guided for missing or unsupported values', () => {
    for (const raw of [null, '', 'unknown', 'FULL', '{"mode":"full"}']) expect(experienceMode(raw)).toBe('guided')
  })

  it('accepts the three display choices', () => {
    expect(experienceMode('simple')).toBe('simple')
    expect(experienceMode('guided')).toBe('guided')
    expect(experienceMode('full')).toBe('full')
    expect(experienceMode('dark')).toBe('guided')
  })
})
