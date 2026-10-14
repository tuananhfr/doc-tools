import { describe, expect, it } from 'vitest'
import { parseEmbedHosts, resolveEmbedHost, toEmbedPath, type EmbedProbe } from './embed-mode'

const HOSTS = ['https://lpc.vn', 'http://localhost:3000']
const probe = (over: Partial<EmbedProbe>): EmbedProbe => ({ search: '?embed=erpcons', framed: true, ancestorOrigin: 'https://lpc.vn', referrer: '', stored: null, hosts: HOSTS, ...over })

describe('parseEmbedHosts', () => {
  it('keeps valid origins only', () => {
    expect(parseEmbedHosts(' https://lpc.vn/erpcons , http://localhost:3000,not a url,')).toEqual(['https://lpc.vn', 'http://localhost:3000'])
    expect(parseEmbedHosts(undefined)).toEqual([])
  })
})

describe('resolveEmbedHost', () => {
  it('embeds when framed by an allowed host that asked for it', () => {
    expect(resolveEmbedHost(probe({}))).toBe('https://lpc.vn')
  })
  it('falls back to the referrer when ancestorOrigins is missing (Firefox)', () => {
    expect(resolveEmbedHost(probe({ ancestorOrigin: null, referrer: 'http://localhost:3000/tools/ghep-pdf' }))).toBe('http://localhost:3000')
  })
  it('never embeds a top-level page, even with a stale stored flag', () => {
    expect(resolveEmbedHost(probe({ framed: false }))).toBeNull()
    expect(resolveEmbedHost(probe({ framed: false, search: '', stored: 'https://lpc.vn' }))).toBeNull()
  })
  it('refuses unknown hosts', () => {
    expect(resolveEmbedHost(probe({ ancestorOrigin: 'https://evil.test' }))).toBeNull()
    expect(resolveEmbedHost(probe({ ancestorOrigin: null, referrer: '' }))).toBeNull()
  })
  it('keeps embedding after an in-frame reload that dropped the query', () => {
    expect(resolveEmbedHost(probe({ search: '', stored: 'https://lpc.vn' }))).toBe('https://lpc.vn')
    expect(resolveEmbedHost(probe({ search: '', stored: 'https://lpc.vn', ancestorOrigin: 'https://evil.test' }))).toBeNull()
  })
  it('does not embed without the request param or a stored flag', () => {
    expect(resolveEmbedHost(probe({ search: '' }))).toBeNull()
  })
})

describe('resolveEmbedHost without ancestorOrigins', () => {
  const own = { ancestorOrigin: null, referrer: 'https://cn.test/ghep-pdf', selfOrigin: 'https://cn.test' }
  it('keeps embedding after in-frame navigation whose referrer is our own origin', () => {
    expect(resolveEmbedHost(probe({ ...own, search: '', stored: 'https://lpc.vn' }))).toBe('https://lpc.vn')
  })
  it('still refuses the query branch when the parent is unknown', () => {
    expect(resolveEmbedHost(probe({ ...own, search: '?embed=erpcons' }))).toBeNull()
  })
  it('keeps the stored host when there is no parent info at all', () => {
    expect(resolveEmbedHost(probe({ ancestorOrigin: null, referrer: '', search: '', stored: 'https://lpc.vn' }))).toBe('https://lpc.vn')
  })
})

describe('toEmbedPath', () => {
  it('drops the leading slash and the embed-only params', () => {
    expect(toEmbedPath('/ghep-pdf', '?embed=erpcons&theme=dark')).toBe('ghep-pdf')
    expect(toEmbedPath('/cong-cu', '?q=pdf&embed=erpcons')).toBe('cong-cu?q=pdf')
    expect(toEmbedPath('/', '')).toBe('')
  })
})
