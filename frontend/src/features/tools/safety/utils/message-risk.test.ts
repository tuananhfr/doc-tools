import { describe, expect, it } from 'vitest'
import { editDistance, findLinks, foldVietnamese, inspectLink, inspectMessage, isOfficialHost, levelOf } from './message-risk'

const severities = (text: string) => inspectLink(text).signals.map((item) => item.severity)

describe('levelOf', () => {
  it('derives the label from the signal list itself', () => {
    expect(levelOf([])).toBe('low')
    expect(levelOf([{ severity: 'low', text: '' }])).toBe('medium')
    expect(levelOf([{ severity: 'medium', text: '' }])).toBe('medium')
    expect(levelOf([{ severity: 'low', text: '' }, { severity: 'medium', text: '' }])).toBe('medium')
    expect(levelOf([{ severity: 'medium', text: '' }, { severity: 'medium', text: '' }])).toBe('high')
    expect(levelOf([{ severity: 'high', text: '' }])).toBe('high')
  })

  it('never shows signals under the "nothing found" label', () => {
    for (const sample of ['http://example.com', 'https://bit.ly/x', 'https://vietcombank.com.vn', 'https://vietconbank.com']) {
      const result = inspectLink(sample)
      expect(result.level === 'low', sample).toBe(result.signals.length === 0)
    }
    for (const sample of ['Gửi mã OTP', 'Mẹ ơi', 'Nhận thưởng tại bit.ly/x']) {
      const result = inspectMessage(sample)
      expect(result.level === 'low', sample).toBe(result.signals.length === 0)
    }
  })
})

describe('foldVietnamese / editDistance', () => {
  it('strips diacritics and lowercases', () => {
    expect(foldVietnamese('Tài khoản bị KHÓA, đừng chuyển')).toBe('tai khoan bi khoa, dung chuyen')
    expect(foldVietnamese('khoá')).toBe('khoa')
  })
  it('counts typos including swapped letters', () => {
    expect(editDistance('vietconbank', 'vietcombank')).toBe(1)
    expect(editDistance('vietcmobank', 'vietcombank')).toBe(1)
    expect(editDistance('vietcornbank', 'vietcombank')).toBe(2)
    expect(editDistance('techcombank', 'vietcombank')).toBeGreaterThan(2)
  })
})

describe('inspectLink', () => {
  it('flags a deceptive login link without opening it', () => {
    expect(inspectLink('http://vietcombank-login.xyz/verify').level).toBe('high')
    expect(inspectLink('https://example.com').level).toBe('low')
    expect(inspectLink('https://google.com').signals).toEqual([])
  })

  it('does not flag official domains or their subdomains', () => {
    for (const link of ['https://vietcombank.com.vn', 'https://www.vietcombank.com.vn/login', 'https://momo.vn', 'https://tpb.vn',
      'https://dichvucong.gov.vn', 'https://vneid.gov.vn/xac-thuc', 'https://techcombank.com', 'bidv.com.vn', 'https://acb.com.vn']) {
      expect(inspectLink(link), link).toEqual({ level: 'low', signals: [] })
    }
    expect(isOfficialHost('portal.agribank.com.vn')).toBe(true)
    expect(isOfficialHost('vietcombank.com.vn.secure-login.ru')).toBe(false)
  })

  it('reads bare domains without http://', () => {
    expect(inspectLink('vietcombank-vn.top').level).toBe('high')
    expect(inspectLink('vietcombank-vn.top').signals.some((item) => item.text.includes('vietcombank'))).toBe(true)
  })

  it('catches bank names with extra words glued on', () => {
    for (const link of ['https://vietcombank-hotro.com', 'https://vietcombankvn.net', 'https://tpbank-hotro.com', 'https://acb-online.cc/login',
      'https://vcb-digibank.net/xac-thuc', 'https://vietcombank.com.vn.secure-login.ru', 'https://momo-khuyenmai.com']) {
      expect(inspectLink(link).level, link).toBe('high')
    }
  })

  it('catches 1–2 character typos of long bank names', () => {
    for (const link of ['https://vietconbank.com/login', 'https://vietcornbank.net', 'https://agrlbank.com', 'https://techcombamk.vn', 'https://sacombnak.com']) {
      expect(inspectLink(link).level, link).toBe('high')
      expect(inspectLink(link).signals[0]?.severity, link).toBe('high')
    }
  })

  it('does not treat real short bank names as typos of each other', () => {
    expect(inspectLink('https://abbank.vn').signals).toEqual([])
    expect(inspectLink('https://vpbank.com.vn').signals).toEqual([])
    expect(inspectLink('https://momokids.com').signals).toEqual([])
  })

  it('only counts "gov" as its own label', () => {
    expect(inspectLink('https://govap.vn').signals).toEqual([])
    expect(inspectLink('https://govaphospital.com').signals).toEqual([])
    expect(inspectLink('https://www.irs.gov').signals).toEqual([])
    expect(inspectLink('https://dichvucong-gov.vn').level).toBe('high')
    expect(inspectLink('http://dichvucong.gov.vn.app/vneid').level).toBe('high')
    expect(inspectLink('https://gov-vn.online').level).toBe('high')
  })

  it('treats plain text as unreadable instead of punycode', () => {
    expect(inspectLink('không phải link')).toEqual({ level: 'unreadable', signals: [] })
    expect(inspectLink('')).toEqual({ level: 'unreadable', signals: [] })
    expect(inspectLink('abc')).toEqual({ level: 'unreadable', signals: [] })
  })

  it('still flags real punycode hosts', () => {
    expect(severities('https://xn--vietcmbank-xyz.com')).toContain('medium')
  })

  it('rates script links as dangerous', () => {
    expect(inspectLink('javascript:alert(1)').level).toBe('high')
    expect(inspectLink('JAVASCRIPT:void(0)').level).toBe('high')
    expect(inspectLink('data:text/html,<script>1</script>').level).toBe('high')
  })

  it('knows more link shorteners', () => {
    for (const link of ['https://bom.so/abc', 'https://shorturl.at/abc', 'https://s.id/x', 'https://rebrand.ly/x', 'https://goo.gl/x']) {
      expect(severities(link), link).toEqual(['medium'])
    }
    expect(inspectLink('http://bit.ly/nhanqua').level).toBe('medium')
  })

  it('flags IP hosts, risky endings, http and login paths', () => {
    expect(inspectLink('http://192.168.1.10/otp').level).toBe('high')
    expect(severities('https://shop-online.xyz')).toEqual(['medium'])
    expect(severities('http://example.com')).toEqual(['low'])
    expect(severities('https://example.com/dang-nhap')).toEqual(['low'])
    expect(inspectLink('http://example.com/dang-nhap').level).toBe('medium')
  })
})

describe('findLinks', () => {
  it('finds scheme links and bare domains, ignoring emails and abbreviations', () => {
    expect(findLinks('Vào https://a.vn/x, hoặc vietcombank-vn.top/xac-thuc.')).toEqual(['https://a.vn/x', 'vietcombank-vn.top/xac-thuc'])
    expect(findLinks('Liên hệ an@example.com tại Tp.HCM, v.v.')).toEqual([])
    expect(findLinks('Bấm javascript:alert(1) đi')).toEqual(['javascript:alert(1)'])
    expect(findLinks('Giá 1.500.000 đ')).toEqual([])
    expect(findLinks('(xem https://bit.ly/abc).')).toEqual(['https://bit.ly/abc'])
  })
})

describe('inspectMessage', () => {
  it('rates an OTP request plus a prize as high', () => {
    expect(inspectMessage('Gửi mã OTP để nhận thưởng ngay').level).toBe('high')
  })

  it('matches unaccented scam texts like accented ones', () => {
    const accented = inspectMessage('Vietcombank thông báo: tài khoản của quý khách sẽ bị khóa trong 24h. Vui lòng xác thực tại https://vietcombank-vn.top/xac-thuc')
    const plain = inspectMessage('VIETCOMBANK: Tai khoan cua quy khach se bi khoa trong 24h. Vui long xac thuc tai vietcombank-vn.top/xac-thuc de tranh gian doan.')
    expect(accented.level).toBe('high')
    expect(plain.level).toBe('high')
    expect(plain.signals.length).toBe(accented.signals.length)
    expect(inspectMessage('Chuc mung ban da trung thuong iPhone 17. Nhan thuong tai http://bit.ly/nhanqua').level).toBe('high')
    expect(inspectMessage('Tuyen CTV viec nhe luong cao, lam nhiem vu tren app').level).toBe('high')
    expect(inspectMessage('Vui long tai ung dung tai link sau').level).toBe('high')
  })

  it('checks bare domains inside a message', () => {
    const result = inspectMessage('Tài khoản của bạn bị khóa. Truy cập vietcombank-vn.top để mở khóa')
    expect(result.level).toBe('high')
    expect(result.signals.some((item) => item.text.includes('vietcombank-vn.top'))).toBe(true)
  })

  it('flags apk files and app installs', () => {
    expect(inspectMessage('Cài ứng dụng VNeID-update.apk tại http://dichvucong-gov.vn.app/vneid').level).toBe('high')
  })

  it('keeps everyday messages clean', () => {
    for (const text of ['Mẹ ơi tối nay con về muộn, mẹ cứ ăn cơm trước nhé.', 'Họp giao ban lúc 8h sáng mai tại phòng 302.',
      'Tra cứu hóa đơn điện tại https://www.evn.com.vn hoặc https://vietcombank.com.vn', 'Anh chuyển khoản ngày mai nhé',
      'Em gửi tài liệu qua app Zalo rồi', 'Tài xế app đang tới', 'Lớp khóa học tiếng Anh khai giảng tại Tp.HCM']) {
      expect(inspectMessage(text), text).toEqual({ level: 'low', signals: [] })
    }
  })

  it('keeps a lone bank OTP notice at medium, not high', () => {
    expect(inspectMessage('Vietcombank: Ma OTP cua Quy khach la 482913. Tuyet doi KHONG cung cap ma nay cho bat ky ai.').level).toBe('medium')
  })

  it('reports each link with its own reasons', () => {
    const result = inspectMessage('Xem http://vietconbank.com/login')
    expect(result.signals).toHaveLength(1)
    expect(result.signals[0].severity).toBe('high')
    expect(result.signals[0].text).toContain('http://vietconbank.com/login')
  })
})
