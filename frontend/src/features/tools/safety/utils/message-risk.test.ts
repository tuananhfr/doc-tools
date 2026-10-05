import { expect, it } from 'vitest'
import { inspectLink, inspectMessage } from './message-risk'

it('flags a deceptive login link without opening it', () => {
  expect(inspectLink('http://vietcombank-login.xyz/verify').level).toBe('high')
  expect(inspectMessage('Gửi mã OTP để nhận thưởng ngay').level).toBe('high')
  expect(inspectLink('https://example.com').level).toBe('low')
})
