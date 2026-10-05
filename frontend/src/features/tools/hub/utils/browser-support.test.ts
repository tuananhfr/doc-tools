import { describe, expect, it } from 'vitest'
import { pdfEngineSupported } from './browser-support'

const fn = () => undefined

/** Một trình duyệt đủ mới: có đủ mọi API pdf.js v6 gọi thẳng. */
function modernScope() {
  return {
    Iterator: fn,
    Promise: { withResolvers: fn, try: fn },
    URL: { parse: fn },
    AbortSignal: { any: fn },
    Math: { sumPrecise: fn },
    Map: { prototype: { getOrInsertComputed: fn } },
    Uint8Array: { prototype: { toHex: fn } },
  }
}

describe('pdfEngineSupported', () => {
  it('accepts a browser that has every API pdf.js calls', () => {
    expect(pdfEngineSupported(modernScope())).toBe(true)
  })

  it('rejects Chrome 109, which has no Iterator global', () => {
    const { Iterator: _missing, ...scope } = modernScope()
    expect(pdfEngineSupported(scope)).toBe(false)
  })

  it.each([
    ['Promise.withResolvers', { Promise: { try: fn } }],
    ['Promise.try', { Promise: { withResolvers: fn } }],
    ['URL.parse', { URL: {} }],
    ['AbortSignal.any', { AbortSignal: {} }],
    ['Math.sumPrecise', { Math: {} }],
    ['Map.prototype.getOrInsertComputed', { Map: { prototype: {} } }],
    ['Uint8Array.prototype.toHex', { Uint8Array: { prototype: {} } }],
  ])('rejects a browser without %s', (_name, override) => {
    expect(pdfEngineSupported({ ...modernScope(), ...override })).toBe(false)
  })

  it('rejects instead of throwing when a whole global is missing', () => {
    expect(pdfEngineSupported({})).toBe(false)
  })
})
