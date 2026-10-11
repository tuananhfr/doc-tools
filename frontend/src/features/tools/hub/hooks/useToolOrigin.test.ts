import { describe, expect, it } from 'vitest'
import { readToolOrigin } from './useToolOrigin'

describe('catalog return location', () => {
  it('keeps local query filters and scroll position', () => {
    expect(readToolOrigin({ toolOrigin: { pathname: '/cong-cu', search: '?q=pdf&nhom=document', scrollTop: 420 } })).toEqual({ pathname: '/cong-cu', search: '?q=pdf&nhom=document', scrollTop: 420 })
  })
  it.each(['https://example.com', '//example.com', '/dang-nhap', '/'])('rejects a non-catalog origin: %s', pathname => {
    expect(readToolOrigin({ toolOrigin: { pathname, search: '', scrollTop: 0 } })).toBeNull()
  })
  it('ignores invalid scroll offsets', () => {
    expect(readToolOrigin({ toolOrigin: { pathname: '/cong-cu', search: '', scrollTop: Infinity } })?.scrollTop).toBe(0)
  })
})
