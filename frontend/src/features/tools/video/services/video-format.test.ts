import { describe, expect, it } from 'vitest'
import { formatSeconds } from './video-format'

describe('formatSeconds', () => {
  it('uses a decimal comma in Vietnamese', () => {
    expect(formatSeconds(12.5, 'vi-VN')).toBe('12,5')
    expect(formatSeconds(10.016, 'vi-VN')).toBe('10,02')
    expect(formatSeconds(10, 'vi-VN')).toBe('10')
  })

  it('follows the locale', () => {
    expect(formatSeconds(12.5, 'en-US')).toBe('12.5')
  })
})
