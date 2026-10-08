import { describe, expect, it } from 'vitest'
import { passwordLengthProblem } from './password-policy'

describe('passwordLengthProblem', () => {
  it('accepts 8 to 128 characters', () => {
    expect(passwordLengthProblem('12345678')).toBeNull()
    expect(passwordLengthProblem('x'.repeat(128))).toBeNull()
  })

  it('rejects shorter and longer passwords', () => {
    expect(passwordLengthProblem('1234567')).toBe('PASSWORD_TOO_SHORT')
    expect(passwordLengthProblem('x'.repeat(129))).toBe('PASSWORD_TOO_LONG')
  })

  it('counts Vietnamese letters once whichever way they were typed', () => {
    const decomposed = 'đặt lại'.normalize('NFD')
    expect(decomposed.length).toBeGreaterThan(8)
    expect(passwordLengthProblem(decomposed)).toBe('PASSWORD_TOO_SHORT')
    expect(passwordLengthProblem('😀'.repeat(8))).toBeNull()
  })
})
