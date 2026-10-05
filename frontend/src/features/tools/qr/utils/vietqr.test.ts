import { expect, it } from 'vitest'
import { buildVietQr, crc16Ccitt } from './vietqr'

it('generates a locally encoded transfer payload with a valid CRC', () => {
  expect(crc16Ccitt('123456789')).toBe('29B1')
  const qr = buildVietQr({ bin: '970415', account: '123456789', amount: '100000', note: 'Thanh toán' })
  expect(qr).toContain('QRIBFTTA')
  expect(qr).toContain('Thanh toan')
  expect(qr?.slice(-4)).toBe(crc16Ccitt(qr!.slice(0, -4)))
  expect(buildVietQr({ bin: '970415', account: '123456789', amount: '-1', note: '' })).toBeNull()
})
