import { afterEach, describe, expect, it, vi } from 'vitest'
import { extractReadLink, fetchReadLinkEnabled, ReadLinkError } from '../services/read-extract.api'
import { normalizeReadLink, readLinkFailureFrom, readLinkHost, readSourceFromExtract } from './read-link'

const DOCUMENT = { ok: true, document: { title: 'Bài thử', sourceUrl: 'https://news.example.com/a', checkedAt: '2026-10-12T00:00:00.000Z', segments: [{ id: 's1', text: 'Tiêu đề', kind: 'heading' }, { id: 's2', text: ' Đoạn một. ', kind: 'paragraph' }] }, warnings: ['TOO_LARGE', 'BOGUS'] }
const reply = (status: number, body: unknown) => vi.fn().mockResolvedValue({ ok: status >= 200 && status < 300, status, json: async () => body })
afterEach(() => vi.unstubAllGlobals())

describe('normalizeReadLink', () => {
  it('adds https to bare hosts, keeps https, refuses everything else', () => {
    expect(normalizeReadLink('  vnexpress.net/bai-viet ')).toBe('https://vnexpress.net/bai-viet')
    expect(normalizeReadLink('https://news.example.com/a?b=1#c')).toBe('https://news.example.com/a?b=1#c')
    for (const raw of ['', '   ', 'http://news.example.com', 'ftp://x.example.com', 'javascript:alert(1)', 'localhost', 'https://u:p@news.example.com', 'https://' + 'a'.repeat(2050) + '.com'])
      expect(normalizeReadLink(raw), raw).toBeNull()
  })
})

describe('readLinkFailureFrom', () => {
  it('maps server codes to the reader codes, rate limits to RATE_LIMITED and the rest to UNSUPPORTED', () => {
    expect(readLinkFailureFrom(422, 'PAYWALL')).toBe('PAYWALL')
    expect(readLinkFailureFrom(422, 'ROBOTS_DENIED')).toBe('ROBOTS_DENIED')
    expect(readLinkFailureFrom(422, 'TOO_LARGE')).toBe('TOO_LARGE')
    expect(readLinkFailureFrom(429, 'READ_RATE_LIMITED')).toBe('RATE_LIMITED')
    expect(readLinkFailureFrom(503, 'READ_BUSY')).toBe('RATE_LIMITED')
    expect(readLinkFailureFrom(404, 'READ_DISABLED')).toBe('UNSUPPORTED')
    expect(readLinkFailureFrom(400, 'READ_INPUT_INVALID')).toBe('UNSUPPORTED')
    expect(readLinkFailureFrom(500, undefined)).toBe('UNSUPPORTED')
  })
})

describe('readSourceFromExtract', () => {
  it('joins segments into paragraphs and keeps only known warnings', () => {
    expect(readSourceFromExtract(DOCUMENT)).toEqual({ kind: 'link', title: 'Bài thử', text: 'Tiêu đề\n\nĐoạn một.', sourceUrl: 'https://news.example.com/a', warnings: ['TOO_LARGE'] })
  })
  it('rejects anything that is not the documented shape', () => {
    for (const value of [null, 'x', { ok: false }, { ok: true }, { ok: true, document: { title: 1, sourceUrl: 'x', segments: [] } }, { ok: true, document: { title: 't', sourceUrl: 'x', segments: [{ text: ' ' }] } }])
      expect(readSourceFromExtract(value)).toBeNull()
  })
  it('reads the host for the source line', () => {
    expect(readLinkHost('https://news.example.com/a')).toBe('news.example.com')
    expect(readLinkHost('nope')).toBeNull()
  })
})

describe('read-extract.api', () => {
  it('sends only the URL, without cookies or referrer, with the trusted-request header', async () => {
    const fetcher = reply(200, DOCUMENT); vi.stubGlobal('fetch', fetcher)
    const source = await extractReadLink('https://news.example.com/a')
    expect(source.text).toBe('Tiêu đề\n\nĐoạn một.')
    const [url, request] = fetcher.mock.calls[0]
    expect(url).toBe('/api/v1/read/extract')
    expect(request).toMatchObject({ method: 'POST', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', headers: { 'X-CN-Request': '1' } })
    expect(JSON.parse(request.body)).toEqual({ url: 'https://news.example.com/a' })
  })
  it('turns server and network failures into reader codes', async () => {
    vi.stubGlobal('fetch', reply(422, { ok: false, code: 'PAYWALL' }))
    await expect(extractReadLink('https://news.example.com/a')).rejects.toMatchObject({ code: 'PAYWALL' })
    vi.stubGlobal('fetch', reply(200, { ok: true, document: null }))
    await expect(extractReadLink('https://news.example.com/a')).rejects.toMatchObject({ code: 'UNSUPPORTED' })
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await extractReadLink('https://news.example.com/a').catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(ReadLinkError)
    expect((error as ReadLinkError).code).toBe('OFFLINE')
  })
  it('treats the link tab as off unless the server says exactly linkEnabled: true', async () => {
    vi.stubGlobal('fetch', reply(200, { ok: true, linkEnabled: true }))
    expect(await fetchReadLinkEnabled()).toBe(true)
    for (const fetcher of [reply(200, { ok: true, linkEnabled: 'true' }), reply(200, { ok: true, user: null }), reply(404, {}), vi.fn().mockRejectedValue(new TypeError('offline'))]) {
      vi.stubGlobal('fetch', fetcher)
      expect(await fetchReadLinkEnabled()).toBe(false)
    }
  })
})
