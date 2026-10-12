import { describe, expect, it, vi } from 'vitest'
import { fetchLegalSource } from './legal-sources.api'

const source = { sourceId: 'evn-2025', issuer: 'Bộ Công Thương', documentNumber: '1279/QĐ-BCT', jurisdiction: 'Toàn quốc', article: 'Điều 1', validFrom: '2025-05-10', validTo: null, checkedAt: '2026-10-01', evidenceUrl: 'https://example.com/a.pdf', status: 'verified' }
const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('fetchLegalSource', () => {
  it('returns the source and the server threshold', async () => {
    const fetcher = reply({ ok: true, source, staleDays: 120 })
    expect(await fetchLegalSource('evn-2025', fetcher)).toEqual({ state: 'ready', source, staleDays: 120 })
    expect(vi.mocked(fetcher).mock.calls[0][0]).toMatch(/\/api\/v1\/sources\/evn-2025$/)
  })
  it('falls back to 90 days when the threshold is missing or odd', async () => {
    const result = await fetchLegalSource('evn-2025', reply({ ok: true, source, staleDays: 'x' }))
    expect(result.state === 'ready' && result.staleDays).toBe(90)
  })
  it('separates "no such source" from "registry down"', async () => {
    expect(await fetchLegalSource('evn-2025', reply({ ok: false, code: 'SOURCE_NOT_FOUND' }, 404))).toEqual({ state: 'missing' })
    expect(await fetchLegalSource('evn-2025', reply({ ok: false }, 503))).toEqual({ state: 'unavailable' })
    expect(await fetchLegalSource('evn-2025', reply({ ok: true, source: { ...source, status: 'draft' } }))).toEqual({ state: 'unavailable' })
    expect(await fetchLegalSource('evn-2025', vi.fn(async () => { throw new TypeError('offline') }) as unknown as typeof fetch)).toEqual({ state: 'unavailable' })
  })
  it('never builds a URL from a malformed id', async () => {
    const fetcher = reply({})
    expect(await fetchLegalSource('../admin', fetcher)).toEqual({ state: 'missing' })
    expect(fetcher).not.toHaveBeenCalled()
  })
})
