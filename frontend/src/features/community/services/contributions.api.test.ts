import { afterEach, describe, expect, it, vi } from 'vitest'
import { addReceiptSource, lookupReceipt, publishedIdeas, submitContribution } from './contributions.api'
import { contributionPayload } from '../utils/contribution-payload'

afterEach(() => vi.restoreAllMocks())
const signal = () => new AbortController().signal

describe('contribution API failures and retry identity', () => {
  it('does not turn a server failure into a missing receipt', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ ok: false, contribution: null }), { status: 503 }))
    await expect(lookupReceipt('a'.repeat(32), signal())).rejects.toThrow('HTTP_503')
  })
  it('keeps an empty successful idea list distinct from a loading failure', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, ideas: [] }))).mockResolvedValueOnce(new Response('{}', { status: 502 }))
    await expect(publishedIdeas(signal())).resolves.toEqual({ ok: true, ideas: [] })
    await expect(publishedIdeas(signal())).rejects.toThrow('HTTP_502')
    expect(fetch).toHaveBeenCalledTimes(2)
  })
  it('sends the same key on retry and only the explicitly entered payload', async () => {
    const receipt = { ok: true, receiptCode: 'r'.repeat(32), status: 'RECEIVED', tracked: false }
    const fetch = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify(receipt)))
    const payload = contributionPayload({ mode: 'feedback', category: 'bug', title: 'Test', detail: 'Expected result', source: null, attribution: false })
    await submitContribution(payload, 'k'.repeat(32)); await submitContribution(payload, 'k'.repeat(32))
    for (const [, init] of fetch.mock.calls) {
      expect(init?.headers).toMatchObject({ 'Idempotency-Key': 'k'.repeat(32), 'X-CN-Request': '1' })
      expect(JSON.parse(init?.body as string)).toEqual(payload)
    }
  })
  it('refuses malformed success receipts and failed source writes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, receiptCode: 'short', status: 'RECEIVED' }))).mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, code: 'EVIDENCE_CLOSED' }), { status: 409 }))
    const payload = contributionPayload({ mode: 'idea', category: 'bug', title: 'Test', detail: 'Example', source: null, attribution: false })
    await expect(submitContribution(payload, 'k'.repeat(32))).rejects.toThrow('INVALID_RESPONSE')
    await expect(addReceiptSource('a'.repeat(32), { url: 'https://example.com/doc', type: 'OFFICIAL_WEB' }, signal())).rejects.toThrow('EVIDENCE_CLOSED')
  })
})
