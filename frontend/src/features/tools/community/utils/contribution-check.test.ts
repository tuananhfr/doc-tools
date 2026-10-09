import { describe, expect, it } from 'vitest'
import { checkSourceUrl, findSensitive } from './contribution-check'

describe('findSensitive', () => {
  it('finds what the backend rejects', () => {
    expect(findSensitive('Liên hệ tôi: an@example.com')).toEqual(['email'])
    expect(findSensitive('Gọi 0901234567 nhé')).toEqual(['phone'])
    expect(findSensitive('SĐT +84 901 234 567')).toEqual(['phone'])
    expect(findSensitive('số 090.123.4567')).toEqual(['phone'])
    expect(findSensitive('password: hunter2')).toEqual(['secret'])
    expect(findSensitive('Authorization: Bearer abc.def')).toEqual(['secret'])
    expect(findSensitive('api_key=XYZ')).toEqual(['secret'])
    expect(findSensitive('xem http://localhost:3000/a')).toEqual(['internalUrl'])
    expect(findSensitive('xem http://192.168.1.5/a')).toEqual(['internalUrl'])
    expect(findSensitive('Liên hệ: 0901234567, an@example.com')).toEqual(['email', 'phone'])
  })

  it('lets normal content through', () => {
    expect(findSensitive('Bậc 1 nay là 1.984 đ/kWh theo Quyết định 1279/QĐ-BCT.')).toEqual([])
    expect(findSensitive('Tính hóa đơn nước theo bậc của Hà Nội, năm 2026.')).toEqual([])
    expect(findSensitive('Mã số 12345678')).toEqual([])
    expect(findSensitive('https://evn.com.vn/bieu-gia')).toEqual([])
  })
})

describe('checkSourceUrl', () => {
  it('accepts an empty field and public https pages', () => {
    expect(checkSourceUrl('')).toBe('ok')
    expect(checkSourceUrl('https://evn.com.vn/bieu-gia?nam=2026')).toBe('ok')
  })

  it('rejects what the backend rejects', () => {
    expect(checkSourceUrl('evn.com.vn')).toBe('invalid')
    expect(checkSourceUrl('http://not-https.example.com/doc?x=1 javascript:alert(1)')).toBe('notHttps')
    expect(checkSourceUrl('http://evn.com.vn')).toBe('notHttps')
    expect(checkSourceUrl('javascript:alert(1)')).toBe('notHttps')
    expect(checkSourceUrl(`https://a.vn/${'x'.repeat(2050)}`)).toBe('invalid')
    for (const url of ['https://user:pw@a.vn', 'https://a.vn/#muc-2', 'https://10.0.0.1/a', 'https://localhost/a', 'https://wiki.local/a',
      'https://api.internal/a', 'https://a.vn/?token=1', 'https://a.vn/?access_key=1', 'https://a.vn/lien-he/an@example.com']) {
      expect(checkSourceUrl(url), url).toBe('unsafe')
    }
  })
})
