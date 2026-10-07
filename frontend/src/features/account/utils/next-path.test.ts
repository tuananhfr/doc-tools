import { describe, expect, it } from 'vitest'
import { loginPath, safeNextPath } from './next-path'

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/cong-cu?nhom=pdf#tim')).toBe('/cong-cu?nhom=pdf#tim')
  })

  it('falls back for anything that could leave the site or loop', () => {
    for (const raw of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', 'javascript:alert(1)', '/a\nb', '/dang-nhap', '/dang-nhap?next=/x']) {
      expect(safeNextPath(raw), String(raw)).toBe('/tai-khoan')
    }
  })

  it('round-trips through the login link', () => {
    const next = new URLSearchParams(loginPath('/tien-dien?a=1&b=2').split('?')[1]).get('next')
    expect(safeNextPath(next)).toBe('/tien-dien?a=1&b=2')
  })
})
