import { expect, it } from 'vitest'
import { buildVietQr, crc16Ccitt, VIETQR_NOTE_MAX, vietQrNote } from './vietqr'

it('generates a locally encoded transfer payload with a valid CRC', () => {
  expect(crc16Ccitt('123456789')).toBe('29B1')
  const qr = buildVietQr({ bin: '970415', account: '123456789', amount: '100000', note: 'Thanh toán' })
  expect(qr).toContain('QRIBFTTA')
  expect(qr).toContain('Thanh toan')
  expect(qr?.slice(-4)).toBe(crc16Ccitt(qr!.slice(0, -4)))
  expect(buildVietQr({ bin: '970415', account: '123456789', amount: '-1', note: '' })).toBeNull()
})

it('reports the transfer message exactly as it goes into the code', () => {
  expect(vietQrNote('Thanh toán hóa đơn tháng 10 - Đặng Đức')).toBe('Thanh toan hoa don thang 10 Dang Duc')
  expect(vietQrNote('🎉 Mừng sinh nhật! @#$ đ')).toBe('Mung sinh nhat d')
  const long = 'Chuyển tiền học phí kỳ 1 năm học 2026-2027 cho cháu Nguyễn Thị Ánh Tuyết lớp 5A'
  expect(vietQrNote(long).length).toBeGreaterThan(VIETQR_NOTE_MAX)
  const qr = buildVietQr({ bin: '970415', account: '123456789', amount: '', note: long })
  expect(qr).toContain(vietQrNote(long).slice(0, VIETQR_NOTE_MAX))
})
