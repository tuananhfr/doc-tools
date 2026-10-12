import { describe, expect, it } from 'vitest'
import { daysBetween, freshnessWarnings, isStale, parseLegalSource, toCheckedDate } from './source-freshness'

// 10:00 sáng 12/10/2026 giờ Việt Nam.
const NOW = new Date('2026-10-12T03:00:00Z')

describe('isStale', () => {
  it('is fresh up to exactly the threshold and stale one day after', () => {
    expect(daysBetween('2026-07-14', '2026-10-12')).toBe(90)
    expect(isStale('2026-07-14', NOW, 90)).toBe(false)
    expect(isStale('2026-07-13', NOW, 90)).toBe(true)
  })
  it('treats missing or malformed dates as stale, never as fresh', () => {
    expect(isStale(null, NOW, 90)).toBe(true)
    expect(isStale(undefined, NOW, 90)).toBe(true)
    expect(isStale('2026-02-30', NOW, 90)).toBe(true)
    expect(isStale('yesterday', NOW, 90)).toBe(true)
  })
  it('reads ISO timestamps on the Vietnam calendar', () => {
    // 20:00 UTC ngày 13/07 là 03:00 ngày 14/07 ở Việt Nam.
    expect(toCheckedDate('2026-07-13T20:00:00Z')).toBe('2026-07-14')
    expect(isStale('2026-07-13T20:00:00Z', NOW, 90)).toBe(false)
  })
})

describe('freshnessWarnings', () => {
  it('lists every reason, strongest first', () => {
    expect(freshnessWarnings({ checkedAt: '2025-01-01', validTo: '2026-01-01', status: 'revoked' }, NOW, 90)).toEqual(['revoked', 'expired', 'stale'])
    expect(freshnessWarnings({ checkedAt: '2026-10-01', status: 'superseded' }, NOW, 90)).toEqual(['superseded'])
  })
  it('says unchecked instead of stale when there is no date', () => {
    expect(freshnessWarnings({ checkedAt: null }, NOW, 90)).toEqual(['unchecked'])
  })
  it('keeps the last valid day in effect', () => {
    expect(freshnessWarnings({ checkedAt: '2026-10-01', validTo: '2026-10-12' }, NOW, 90)).toEqual([])
  })
})

describe('parseLegalSource', () => {
  const valid = { sourceId: 'evn-2025', issuer: 'Bộ Công Thương', documentNumber: '1279/QĐ-BCT', jurisdiction: 'Toàn quốc', article: null, validFrom: '2025-05-10', validTo: null, checkedAt: '2026-10-01', evidenceUrl: 'https://example.com/a.pdf', status: 'verified' }
  it('accepts the public shape', () => { expect(parseLegalSource(valid)?.documentNumber).toBe('1279/QĐ-BCT') })
  it('rejects drafts, http links and bad dates', () => {
    expect(parseLegalSource({ ...valid, status: 'draft' })).toBeNull()
    expect(parseLegalSource({ ...valid, evidenceUrl: 'http://example.com' })).toBeNull()
    expect(parseLegalSource({ ...valid, checkedAt: '01/10/2026' })).toBeNull()
    expect(parseLegalSource(null)).toBeNull()
  })
})
