import { describe, expect, it } from 'vitest'
import { normalizeVietnameseText as normalize } from './vi-text-normalize'

describe('normalizeVietnameseText', () => {
  it('expands fixed administrative abbreviations, including ones ending in Đ', () => {
    expect(normalize('UBND TP. Hà Nội')).toBe('ủy ban nhân dân thành phố Hà Nội')
    expect(normalize('Nghị định 15/NĐ-CP')).toBe('Nghị định 15 nghị định chính phủ')
    expect(normalize('Giá 500.000 VNĐ.')).toBe('Giá 500.000 đồng.')
    expect(normalize('SĐT: 0912 345 678')).toBe('số điện thoại: không chín một hai ba bốn năm sáu bảy tám')
    expect(normalize('Q. 1, P. Bến Nghé, TP HCM')).toBe('quận 1, phường Bến Nghé, thành phố Hồ Chí Minh')
  })

  it('spells unknown acronyms but keeps all-caps Vietnamese words and roman numerals', () => {
    expect(normalize('Rút tiền ATM')).toBe('Rút tiền a tê em mờ')
    expect(normalize('QUYẾT ĐỊNH')).toBe('quyết định')
    expect(normalize('Chương IV')).toBe('Chương IV')
    expect(normalize('iPhone')).toBe('iPhone')
  })

  it('reads phone numbers digit by digit without touching money', () => {
    expect(normalize('Gọi +84 912 345 678')).toBe('Gọi cộng tám tư chín một hai ba bốn năm sáu bảy tám')
    expect(normalize('028.3829.1234')).toBe('không hai tám ba tám hai chín một hai ba bốn')
    expect(normalize('1.250.000 đồng')).toBe('1.250.000 đồng')
  })

  it('reads dates and times with their units', () => {
    expect(normalize('trước 31/12')).toBe('trước ngày 31 tháng 12')
    expect(normalize('ngày 05/09/2026')).toBe('ngày 5 tháng 9 năm 2026')
    expect(normalize('Hạn 05-09-2026')).toBe('Hạn ngày 5 tháng 9 năm 2026')
    expect(normalize('kỳ 10/2026, tháng 11/2026')).toBe('kỳ tháng 10 năm 2026, tháng 11 năm 2026')
    expect(normalize('Ngày 2/9')).toBe('Ngày 2 tháng 9')
    expect(normalize('họp lúc 14h30 hoặc 9:05')).toBe('họp lúc 14 giờ 30 phút hoặc 9 giờ 5 phút')
    expect(normalize('số 13/2023/NĐ-CP')).toBe('số 13 2023 nghị định chính phủ')
    expect(normalize('tỉ lệ 45/90')).toBe('tỉ lệ 45 90')
  })

  it('speaks email and web addresses symbol by symbol', () => {
    expect(normalize('gửi hotro@lpc.vn nhé')).toBe('gửi hotro a còng lpc chấm vn nhé')
    expect(normalize('Xem https://chuyennho.tekshot.ai/cong-cu.')).toBe('Xem chuyennho chấm tekshot chấm ai gạch chéo cong gạch ngang cu.')
  })

  it('names units and currency symbols', () => {
    expect(normalize('Nhà 80m2, cách 3km, nặng 5kg, giá 100đ')).toBe('Nhà 80 mét vuông, cách 3 ki lô mét, nặng 5 ki lô gam, giá 100 đồng')
    expect(normalize('A & B, v.v.')).toBe('A và B, vân vân')
    expect(normalize('Chờ đã…')).toBe('Chờ đã.')
  })
})
