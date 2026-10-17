import { afterEach, expect, it, vi } from 'vitest'
import { ALL_TOOLS } from '@/features/tools/hub/config/tool-list'
import { entRequest, entResult, newDrawKey } from './entertainment.api'

afterEach(() => vi.unstubAllGlobals())
it('entertainment tools are directly runnable without a sandbox flag', () => {
  for (const id of ['numerology', 'playing-cards', 'tarot']) {
    expect(ALL_TOOLS.find(tool => tool.id === id)).toMatchObject({ status: 'ready', screen: id })
  }
})
it('draw keys carry creation time and distinct high entropy identifiers', () => {
  const a = newDrawKey(), b = newDrawKey()
  expect(a).toMatch(/^[a-z0-9]{8,10}_[a-f0-9]{32}$/)
  expect(a).not.toBe(b)
  expect(Math.abs(parseInt(a.split('_')[0], 36) - Date.now())).toBeLessThan(1000)
})
it('guest requests omit account credentials and preserve the idempotency key', async () => {
  const reply = { ok: true, disclaimer_id: 'cn-ent-reference-v1', rule_version: 'draft-v1', source_ids: ['spec'], result: { cards: [] } }
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => reply })
  vi.stubGlobal('fetch', fetcher)
  await entResult('cards/draw', { spread: 3, reversed: false }, 'same-key')
  expect(fetcher.mock.calls[0][1]).toMatchObject({ method: 'POST', credentials: 'omit', cache: 'no-store', headers: { 'X-CN-Request': '1', 'Idempotency-Key': 'same-key' } })
})
it('server errors and missing disclaimer/provenance cannot become normal results', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({ ok: false, code: 'SESSION_EXPIRED' }) }))
  await expect(entResult('cards/draw', {})).rejects.toMatchObject({ code: 'SESSION_EXPIRED' })
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true, result: {} }) }))
  await expect(entResult('cards/draw', {})).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})
it.each([500, 502, 503, 504])('identifies an unavailable backend for HTTP %i before parsing proxy text', async status => {
  const json = vi.fn().mockRejectedValue(new SyntaxError('Not JSON'))
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, json }))
  await expect(entResult('tarot/draw', { spread: 3, reversed: false }, 'retry-key')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' })
  expect(json).not.toHaveBeenCalled()
})
it('identifies a failed connection and preserves cancellation', async () => {
  const failure = new TypeError('Failed to fetch')
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(failure))
  await expect(entRequest('tools')).rejects.toMatchObject({ code: 'NETWORK_ERROR' })
  const controller = new AbortController()
  controller.abort()
  await expect(entRequest('tools', undefined, undefined, controller.signal)).rejects.toBe(failure)
})
it.each([null, 'Internal Server Error'])('rejects a malformed success envelope: %s', async value => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => value }))
  await expect(entRequest('tools')).rejects.toMatchObject({ code: 'INVALID_RESPONSE' })
})
it('preserves actionable validation and rate limit errors', async () => {
  for (const [status, code] of [[422, 'INVALID_SPREAD'], [429, 'RATE_LIMITED']] as const) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status, json: async () => ({ ok: false, code }) }))
    await expect(entResult('cards/draw', {})).rejects.toMatchObject({ code })
  }
})
