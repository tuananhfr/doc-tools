import { describe, expect, it } from 'vitest'
import { readToolOrigin } from './useToolOrigin'

describe('catalog return location', () => {
  it('keeps local query filters and scroll position', () => {
    expect(readToolOrigin({ toolOrigin: { pathname: '/', search: '?q=pdf&nhom=document', scrollTop: 420 } })).toEqual({ pathname: '/', search: '?q=pdf&nhom=document', scrollTop: 420 })
  })
  it('normalizes return locations captured before the URL migration', () => {
    expect(readToolOrigin({ toolOrigin: { pathname: '/cong-cu', search: '?nhom=hinh-anh', scrollTop: 420 } })).toEqual({ pathname: '/', search: '?nhom=hinh-anh', scrollTop: 420 })
  })
  it.each(['https://example.com', '//example.com', '/dang-nhap', '/gioi-thieu'])('rejects a non-catalog origin: %s', pathname => {
    expect(readToolOrigin({ toolOrigin: { pathname, search: '', scrollTop: 0 } })).toBeNull()
  })
  it('ignores invalid scroll offsets', () => {
    expect(readToolOrigin({ toolOrigin: { pathname: '/cong-cu', search: '', scrollTop: Infinity } })?.scrollTop).toBe(0)
  })
})
