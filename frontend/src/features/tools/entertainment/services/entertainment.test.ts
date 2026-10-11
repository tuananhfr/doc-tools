import { afterEach, expect, it, vi } from 'vitest'
import { ALL_TOOLS } from '@/features/tools/hub/config/tool-list'
import { sandboxTools } from '../config/sandbox-tools'
import { entResult, newDrawKey } from './entertainment.api'

afterEach(() => vi.unstubAllGlobals())
it('only the three approved sandbox entries become runnable behind the flag', () => {
  const off = sandboxTools(ALL_TOOLS, false)
  const on = sandboxTools(ALL_TOOLS, true)
  expect(off.filter(tool => tool.status === 'ready')).toHaveLength(66)
  expect(on.filter(tool => tool.status === 'ready')).toHaveLength(69)
  expect(off.find(tool => tool.id === 'numerology')?.status).toBe('soon')
  expect(on.find(tool => tool.id === 'numerology')).toMatchObject({ status: 'ready', screen: 'numerology' })
  expect(on.find(tool => tool.id === 'lunar-calendar')).toEqual(off.find(tool => tool.id === 'lunar-calendar'))
})
it('draw keys carry creation time and distinct high entropy identifiers', () => {
  const a = newDrawKey(), b = newDrawKey()
  expect(a).toMatch(/^[a-z0-9]{8,10}_[a-f0-9]{32}$/)
  expect(a).not.toBe(b)
  expect(Math.abs(parseInt(a.split('_')[0], 36) - Date.now())).toBeLessThan(1000)
})
it('guest requests omit account credentials and preserve the idempotency key', async () => {
  const reply = { ok: true, public_release: 'BLOCKED', verification_level: 'TECHNICAL_SANDBOX', disclaimer_id: 'cn-ent-reference-v1', rule_version: 'draft-v1', source_ids: ['spec'], result: { cards: [] } }
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
