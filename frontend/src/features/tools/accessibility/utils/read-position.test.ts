import { describe, expect, it } from 'vitest'
import { recallPosition, rememberPosition, textFingerprint } from './read-position'

describe('read position', () => {
  it('fingerprints are stable, length-aware and differ per text', () => {
    expect(textFingerprint('Một. Hai.')).toBe('b91d59ef-9')
    expect(textFingerprint('')).toBe('811c9dc5-0')
    expect(textFingerprint('a')).not.toBe(textFingerprint('b'))
  })

  it('remembers only a hash and an offset, never the text', () => {
    const text = 'Bí mật của bà. Câu hai.'
    const raw = rememberPosition(null, textFingerprint(text), 15, 1000)
    expect(raw).not.toContain('Bí mật')
    expect(recallPosition(raw, textFingerprint(text))).toBe(15)
    expect(recallPosition(raw, textFingerprint('Văn bản khác'))).toBeNull()
  })

  it('keeps only the most recent entries', () => {
    let raw: string | null = null
    for (let index = 0; index < 25; index++) raw = rememberPosition(raw, `k${index}`, index + 1, index)
    expect(Object.keys(JSON.parse(raw!).items)).toHaveLength(20)
    expect(recallPosition(raw, 'k24')).toBe(25)
    expect(recallPosition(raw, 'k0')).toBeNull()
  })

  it('treats broken or foreign storage as empty and an offset of 0 as nothing to resume', () => {
    expect(recallPosition('không phải json', 'x')).toBeNull()
    expect(recallPosition(JSON.stringify({ v: 1, items: { x: { o: 'a', t: 1 } } }), 'x')).toBeNull()
    expect(recallPosition(rememberPosition(null, 'x', 0, 1), 'x')).toBeNull()
    expect(JSON.parse(rememberPosition('{"v":2}', 'x', 3, 1))).toEqual({ v: 1, items: { x: { o: 3, t: 1 } } })
  })
})
