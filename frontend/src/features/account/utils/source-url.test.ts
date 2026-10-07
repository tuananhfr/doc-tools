import { describe, expect, it } from 'vitest'
import { isHttpsUrl } from './source-url'

describe('isHttpsUrl', () => {
  it('accepts https links, trimming spaces', () => {
    expect(isHttpsUrl(' https://thuvienphapluat.vn/van-ban/abc ')).toBe(true)
  })

  it('rejects other schemes, credentials and plain text', () => {
    expect(isHttpsUrl('http://example.com')).toBe(false)
    expect(isHttpsUrl('https://user:pass@example.com')).toBe(false)
    expect(isHttpsUrl('example.com/page')).toBe(false)
    expect(isHttpsUrl('')).toBe(false)
  })
})
