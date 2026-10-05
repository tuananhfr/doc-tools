import { describe, expect, it } from 'vitest'
import type { QrForm } from '../types/qr.types'
import { qrFileName } from './qr-file-name'
import { buildPayload, escapeVcard, escapeWifi, INITIAL_QR_FORM } from './qr-payload'
import { readScanContent } from './scan-content'

const form = (patch: Partial<QrForm>): QrForm => ({ ...INITIAL_QR_FORM, ...patch })

describe('buildPayload', () => {
  it('chưa nhập gì thì không phải lỗi', () => {
    expect(buildPayload(form({}))).toEqual({ ok: false, reason: null })
    expect(buildPayload(form({ kind: 'wifi' }))).toEqual({ ok: false, reason: null })
    expect(buildPayload(form({ kind: 'text', text: '   ' }))).toEqual({ ok: false, reason: null })
  })

  it('tự thêm https:// cho đường dẫn thiếu giao thức', () => {
    expect(buildPayload(form({ url: ' erpcons.vn/gia ' }))).toEqual({ ok: true, text: 'https://erpcons.vn/gia' })
    expect(buildPayload(form({ url: 'http://lpc.vn' }))).toEqual({ ok: true, text: 'http://lpc.vn' })
    expect(buildPayload(form({ url: 'zalo://chat' }))).toEqual({ ok: true, text: 'zalo://chat' })
  })

  it('từ chối đường dẫn có khoảng trắng', () => {
    expect(buildPayload(form({ url: 'erpcons vn' }))).toMatchObject({ ok: false, reason: expect.stringContaining('khoảng trắng') })
  })

  it('giữ nguyên văn bản, kể cả xuống dòng', () => {
    expect(buildPayload(form({ kind: 'text', text: 'Kho B\nkệ 12' }))).toEqual({ ok: true, text: 'Kho B\nkệ 12' })
  })

  it('dựng chuỗi Wi-Fi và thoát ký tự đặc biệt', () => {
    expect(buildPayload(form({ kind: 'wifi', ssid: 'BCH;Tang 2', password: 'a:b,c"d\\e' }))).toEqual({
      ok: true,
      text: 'WIFI:T:WPA;S:BCH\\;Tang 2;P:a\\:b\\,c\\"d\\\\e;;',
    })
    expect(buildPayload(form({ kind: 'wifi', ssid: 'Khach', security: 'nopass', password: 'bo qua', hidden: true }))).toEqual({
      ok: true,
      text: 'WIFI:T:nopass;S:Khach;H:true;;',
    })
  })

  it('bắt mật khẩu Wi-Fi thiếu hoặc quá ngắn', () => {
    expect(buildPayload(form({ kind: 'wifi', ssid: 'BCH' }))).toMatchObject({ ok: false, reason: expect.stringContaining('mật khẩu') })
    expect(buildPayload(form({ kind: 'wifi', ssid: 'BCH', password: '1234567' }))).toMatchObject({ ok: false, reason: expect.stringContaining('8 ký tự') })
    expect(buildPayload(form({ kind: 'wifi', ssid: 'BCH', security: 'WEP', password: '12345' })).ok).toBe(true)
  })

  it('gọt số điện thoại về chữ số, giữ dấu + đầu', () => {
    expect(buildPayload(form({ kind: 'phone', phone: '0912 345 678' }))).toEqual({ ok: true, text: 'tel:0912345678' })
    expect(buildPayload(form({ kind: 'phone', phone: '+84 (912) 345-678' }))).toEqual({ ok: true, text: 'tel:+84912345678' })
    expect(buildPayload(form({ kind: 'phone', phone: 'gọi tôi' })).ok).toBe(false)
    expect(buildPayload(form({ kind: 'phone', phone: '12' })).ok).toBe(false)
  })

  it('dựng mailto, mã hoá tiêu đề', () => {
    expect(buildPayload(form({ kind: 'email', email: 'ketoan@lpc.vn' }))).toEqual({ ok: true, text: 'mailto:ketoan@lpc.vn' })
    expect(buildPayload(form({ kind: 'email', email: 'ketoan@lpc.vn', subject: 'Báo giá & hợp đồng' }))).toEqual({
      ok: true,
      text: 'mailto:ketoan@lpc.vn?subject=B%C3%A1o%20gi%C3%A1%20%26%20h%E1%BB%A3p%20%C4%91%E1%BB%93ng',
    })
    expect(buildPayload(form({ kind: 'email', email: 'ketoan@lpc' })).ok).toBe(false)
  })

  it('dựng vCard 3.0, bỏ dòng của ô để trống', () => {
    expect(buildPayload(form({ kind: 'vcard', contactName: 'Nguyễn Văn An', contactPhone: '0912 345 678' }))).toEqual({
      ok: true,
      text: ['BEGIN:VCARD', 'VERSION:3.0', 'N:Nguyễn Văn An;;;;', 'FN:Nguyễn Văn An', 'TEL;TYPE=CELL:0912345678', 'END:VCARD'].join('\r\n'),
    })
    expect(
      buildPayload(form({ kind: 'vcard', contactName: 'Trần Thị B', contactPhone: '+84 912 345 678', contactEmail: 'b@lpc.vn', contactOrg: 'LPC; Chi nhánh 2', contactTitle: 'Kế toán, thủ quỹ' })),
    ).toEqual({
      ok: true,
      text: ['BEGIN:VCARD', 'VERSION:3.0', 'N:Trần Thị B;;;;', 'FN:Trần Thị B', 'ORG:LPC\\; Chi nhánh 2', 'TITLE:Kế toán\\, thủ quỹ', 'TEL;TYPE=CELL:+84912345678', 'EMAIL:b@lpc.vn', 'END:VCARD'].join('\r\n'),
    })
  })

  it('vCard cần họ tên và một cách liên lạc', () => {
    expect(buildPayload(form({ kind: 'vcard' }))).toEqual({ ok: false, reason: null })
    expect(buildPayload(form({ kind: 'vcard', contactOrg: 'LPC' }))).toEqual({ ok: false, reason: null })
    expect(buildPayload(form({ kind: 'vcard', contactPhone: '0912345678' }))).toMatchObject({ ok: false, reason: expect.stringContaining('họ tên') })
    expect(buildPayload(form({ kind: 'vcard', contactName: 'An' }))).toMatchObject({ ok: false, reason: expect.stringContaining('số điện thoại hoặc email') })
    expect(buildPayload(form({ kind: 'vcard', contactName: 'An', contactPhone: 'gọi tôi' })).ok).toBe(false)
    expect(buildPayload(form({ kind: 'vcard', contactName: 'An', contactEmail: 'an@lpc' })).ok).toBe(false)
    expect(buildPayload(form({ kind: 'vcard', contactName: 'An', contactEmail: 'an@lpc.vn' })).ok).toBe(true)
  })

  it('escape ký tự riêng của vCard', () => {
    expect(escapeVcard('a\\b;c,d\ne')).toBe('a\\\\b\\;c\\,d\\ne')
  })
})

describe('readScanContent', () => {
  it('chỉ coi http(s) là đường dẫn mở được', () => {
    expect(readScanContent('https://erpcons.vn/gia?x=1')).toEqual({ kind: 'url', href: 'https://erpcons.vn/gia?x=1', host: 'erpcons.vn' })
    expect(readScanContent('HTTP://LPC.VN')).toMatchObject({ kind: 'url', host: 'lpc.vn' })
    expect(readScanContent('javascript:alert(1)')).toEqual({ kind: 'text' })
    expect(readScanContent('erpcons.vn')).toEqual({ kind: 'text' })
    expect(readScanContent('https://')).toEqual({ kind: 'text' })
  })

  it('đọc ngược chuỗi Wi-Fi do buildPayload dựng', () => {
    const ssid = 'BCH;Tang:2'
    const password = 'a\\b;c,"d'
    const payload = buildPayload(form({ kind: 'wifi', ssid, password }))
    if (!payload.ok) throw new Error('payload phải dựng được')
    expect(readScanContent(payload.text)).toEqual({ kind: 'wifi', ssid, password, security: 'WPA' })
    expect(escapeWifi(ssid)).toBe('BCH\\;Tang\\:2')
  })

  it('đọc Wi-Fi không mật khẩu và chuỗi Wi-Fi hỏng', () => {
    expect(readScanContent('WIFI:S:Khach;T:nopass;;')).toEqual({ kind: 'wifi', ssid: 'Khach', password: '', security: 'nopass' })
    expect(readScanContent('WIFI:T:WPA;P:12345678;;')).toEqual({ kind: 'text' })
  })

  it('nhận số điện thoại, email, còn lại là chữ', () => {
    expect(readScanContent('tel:+84912345678')).toEqual({ kind: 'phone', number: '+84912345678' })
    expect(readScanContent('mailto:ketoan@lpc.vn?subject=x')).toEqual({ kind: 'email', address: 'ketoan@lpc.vn' })
    expect(readScanContent('8934567890123')).toEqual({ kind: 'text' })
  })
})

describe('qrFileName', () => {
  it('lấy phần nhận ra được của nội dung', () => {
    expect(qrFileName(form({ url: 'https://erpcons.vn/gia?x=1' }))).toBe('Mã QR - erpcons.vn')
    expect(qrFileName(form({ url: 'erpcons.vn' }))).toBe('Mã QR - erpcons.vn')
    expect(qrFileName(form({ kind: 'wifi', ssid: 'BCH: Tang 2' }))).toBe('Mã QR - BCH Tang 2')
    expect(qrFileName(form({ kind: 'vcard', contactName: 'Nguyễn Văn An' }))).toBe('Mã QR - Nguyễn Văn An')
    expect(qrFileName(form({ kind: 'text', text: 'Kho B / kệ 12\ndòng hai' }))).toBe('Mã QR - Kho B kệ 12')
  })

  it('cắt tên dài và không để dấu chấm cuối', () => {
    expect(qrFileName(form({ kind: 'text', text: 'a'.repeat(80) }))).toBe(`Mã QR - ${'a'.repeat(40)}`)
    expect(qrFileName(form({ kind: 'text', text: 'Hết.' }))).toBe('Mã QR - Hết')
    expect(qrFileName(form({ kind: 'text', text: '???' }))).toBe('Mã QR')
  })
})
