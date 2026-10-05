import { describe, expect, it } from 'vitest'
import { parseRecent, pushRecent, RECENT_LIMIT } from './hub-prefs'

describe('pushRecent', () => {
  it('puts the newest tool first without repeating it', () => {
    expect(pushRecent(['ghep-pdf', 'tach-pdf'], 'tach-pdf')).toEqual(['tach-pdf', 'ghep-pdf'])
  })

  it('drops the oldest once the list is full', () => {
    const full = Array.from({ length: RECENT_LIMIT }, (_, index) => `tool-${index}`)
    const next = pushRecent(full, 'nen-pdf')
    expect(next).toHaveLength(RECENT_LIMIT)
    expect(next[0]).toBe('nen-pdf')
    expect(next).not.toContain(`tool-${RECENT_LIMIT - 1}`)
  })
})

describe('parseRecent', () => {
  it('reads a stored list', () => {
    expect(parseRecent('["ghep-pdf","nen-pdf"]')).toEqual(['ghep-pdf', 'nen-pdf'])
  })

  it('falls back to empty on anything that is not a list of strings', () => {
    expect(parseRecent(null)).toEqual([])
    expect(parseRecent('not json')).toEqual([])
    expect(parseRecent('{"a":1}')).toEqual([])
    expect(parseRecent('["ghep-pdf",3,null]')).toEqual(['ghep-pdf'])
  })
})
