import { describe, expect, it } from 'vitest'
import { formatClock, isValidMinutes, nextSession, secondsLeft } from './pomodoro'

describe('pomodoro', () => {
  it('validates minutes per session', () => {
    expect(isValidMinutes('focus', 25)).toBe(true)
    expect(isValidMinutes('focus', 180)).toBe(true)
    expect(isValidMinutes('focus', 181)).toBe(false)
    expect(isValidMinutes('break', 60)).toBe(true)
    expect(isValidMinutes('break', 61)).toBe(false)
    expect(isValidMinutes('break', 0)).toBe(false)
    expect(isValidMinutes('focus', 2.5)).toBe(false)
    expect(isValidMinutes('focus', Number.NaN)).toBe(false)
  })

  it('alternates sessions', () => {
    expect(nextSession('focus')).toBe('break')
    expect(nextSession('break')).toBe('focus')
  })

  it('rounds remaining seconds up and never below zero', () => {
    expect(secondsLeft(10_000, 9_800)).toBe(1)
    expect(secondsLeft(10_000, 10_000)).toBe(0)
    expect(secondsLeft(10_000, 12_000)).toBe(0)
  })

  it('formats the clock', () => {
    expect(formatClock(25 * 60)).toBe('25:00')
    expect(formatClock(61)).toBe('01:01')
    expect(formatClock(180 * 60)).toBe('180:00')
    expect(formatClock(-3)).toBe('00:00')
  })
})
