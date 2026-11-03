import { describe, expect, it } from 'vitest'
import { randomTypingLesson, readTypingProgress, typingCharacters, typingEdits, typingFinger, typingMetrics } from './typing'

describe('typing practice', () => {
  it('generates level-appropriate exercises without repeating the current one', () => {
    const first = randomTypingLesson('basic', 0, 'vi', '', () => 0)
    const second = randomTypingLesson('basic', 0, 'vi', first, () => 0)
    expect(first).toMatch(/^[fjdk ]+$/)
    expect(first.length).toBeGreaterThan(40)
    expect(second).not.toBe(first)
    const advanced = randomTypingLesson('advanced', 1, 'vi', '', () => 0)
    expect(advanced).toMatch(/[à-ỹ]/u)
    expect(randomTypingLesson('advanced', 1, 'vi', advanced, () => 0)).not.toBe(advanced)
    expect(randomTypingLesson('advanced', 2, 'en', '', () => 0)).toContain('08:30')
  })
  it('handles composed Vietnamese without counting intermediate IME keystrokes', () => {
    expect(typingCharacters('a\u0301')).toEqual(['á'])
    expect(typingEdits('', 'Việt', 'Việt')).toEqual({ attempts: 4, correct: 4 })
    expect(typingEdits('a\u0301', 'á', 'á')).toEqual({ attempts: 0, correct: 0 })
  })
  it('counts corrections as new attempts and does not reward deleting mistakes', () => {
    expect(typingEdits('abx', 'ab', 'abc')).toEqual({ attempts: 0, correct: 0 })
    expect(typingEdits('abx', 'abc', 'abc')).toEqual({ attempts: 1, correct: 1 })
    expect(typingMetrics('abc', 'abc', 60000, 4, 3)).toMatchObject({ accuracy: 75, complete: true })
  })
  it('measures correct characters and completion', () => {
    expect(typingMetrics('hello', 'hello', 60000, 5, 5)).toEqual({ wpm: 1, accuracy: 100, progress: 100, complete: true })
    expect(typingMetrics('helxo', 'hello', 60000, 5, 4)).toMatchObject({ accuracy: 80, complete: false })
  })
  it('ignores corrupt saved progress and bounds history', () => {
    expect(readTypingProgress('{')).toEqual([])
    expect(readTypingProgress('[{"wpm":-1}]')).toEqual([])
    const record = { level: 'basic', wpm: 30, accuracy: 98, at: 1000 }
    expect(readTypingProgress(JSON.stringify(Array(25).fill(record)))).toHaveLength(20)
  })
  it('maps keys and accented letters to the correct finger', () => {
    expect(typingFinger('f')).toBe(3)
    expect(typingFinger('j')).toBe(4)
    expect(typingFinger('ế')).toBe(2)
    expect(typingFinger(' ')).toBe(8)
    expect(typingFinger('')).toBeNull()
  })
})
