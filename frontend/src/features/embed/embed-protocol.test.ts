import { describe, expect, it, vi } from 'vitest'
import { acceptGuestEvent, acceptHostEvent, EMBED_NS, EMBED_VERSION, isEmbedPath, MAX_SAVE_FILES, readGuestMessage, readHostMessage, wrap } from './embed-protocol'

const env = (type: string, payload: unknown, v: unknown = EMBED_VERSION) => ({ ns: EMBED_NS, v, type, payload })
const file = (name = 'a.pdf') => new File(['x'], name, { type: 'application/pdf' })

describe('isEmbedPath', () => {
  it.each(['', 'cong-cu', 'ghep-pdf', 'cong-cu?q=pdf&nhom=tai-lieu', 'huong-dan/ghep-pdf'])('accepts %s', path => expect(isEmbedPath(path)).toBe(true))
  it.each(['/ghep-pdf', '//evil.com', 'https://evil.com', '../admin', 'a/../b', 'GHEP', 'ghep pdf', 'a#b', 42, null])('rejects %s', path => expect(isEmbedPath(path)).toBe(false))
})

describe('readGuestMessage', () => {
  it('reads every guest message', () => {
    expect(readGuestMessage(env('ready', { path: 'cong-cu', title: 'T' }))).toEqual({ type: 'ready', payload: { path: 'cong-cu', title: 'T' } })
    expect(readGuestMessage(env('navigate', { path: 'ghep-pdf' }))).toEqual({ type: 'navigate', payload: { path: 'ghep-pdf' } })
    expect(readGuestMessage(env('dirty', { value: true }))).toEqual({ type: 'dirty', payload: { value: true } })
    const files = [file()]
    expect(readGuestMessage(env('save-to-cde', { files }))).toEqual({ type: 'save-to-cde', payload: { files } })
  })
  it('rejects foreign namespaces, unknown types and malformed payloads', () => {
    expect(readGuestMessage({ ...env('navigate', { path: 'x' }), ns: 'other' })).toBeNull()
    expect(readGuestMessage(env('explode', {}))).toBeNull()
    expect(readGuestMessage(env('navigate', { path: '//evil.com' }))).toBeNull()
    expect(readGuestMessage(env('dirty', { value: 'yes' }))).toBeNull()
    expect(readGuestMessage(env('save-to-cde', { files: [] }))).toBeNull()
    expect(readGuestMessage(env('save-to-cde', { files: ['a.pdf'] }))).toBeNull()
    expect(readGuestMessage(env('save-to-cde', { files: Array.from({ length: MAX_SAVE_FILES + 1 }, () => file()) }))).toBeNull()
    expect(readGuestMessage('hello')).toBeNull()
    expect(readGuestMessage(null)).toBeNull()
  })
  it('ignores another protocol version and warns once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(readGuestMessage(env('dirty', { value: true }, 2))).toBeNull()
    expect(readGuestMessage(env('dirty', { value: true }, 2))).toBeNull()
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})

describe('readHostMessage', () => {
  it('reads init and drops unknown capabilities', () => {
    expect(readHostMessage(env('init', { theme: 'dark', capabilities: ['cde', 'teleport'] }))).toEqual({ type: 'init', payload: { theme: 'dark', capabilities: ['cde'] } })
    expect(readHostMessage(env('theme', { mode: 'field' }))).toEqual({ type: 'theme', payload: { mode: 'field' } })
  })
  it('rejects bad themes', () => {
    expect(readHostMessage(env('theme', { mode: 'neon' }))).toBeNull()
    expect(readHostMessage(env('init', { theme: 'dark', capabilities: 'cde' }))).toBeNull()
  })
})

describe('event gates', () => {
  const frame = {}
  const data = wrap({ type: 'dirty', payload: { value: true } })
  it('accepts only the expected origin and window', () => {
    expect(acceptGuestEvent({ origin: 'https://cn.test', source: frame as never, data }, 'https://cn.test', frame)).toEqual({ type: 'dirty', payload: { value: true } })
    expect(acceptGuestEvent({ origin: 'https://evil.test', source: frame as never, data }, 'https://cn.test', frame)).toBeNull()
    expect(acceptGuestEvent({ origin: 'https://cn.test', source: {} as never, data }, 'https://cn.test', frame)).toBeNull()
    expect(acceptGuestEvent({ origin: 'https://cn.test', source: frame as never, data }, 'https://cn.test', null)).toBeNull()
  })
  it('host gate mirrors the guest gate', () => {
    const parent = {}
    const init = wrap({ type: 'theme', payload: { mode: 'dark' } })
    expect(acceptHostEvent({ origin: 'https://lpc.vn', source: parent as never, data: init }, 'https://lpc.vn', parent)).toEqual({ type: 'theme', payload: { mode: 'dark' } })
    expect(acceptHostEvent({ origin: 'https://lpc.vn', source: {} as never, data: init }, 'https://lpc.vn', parent)).toBeNull()
  })
})
