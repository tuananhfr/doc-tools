import { describe, expect, it } from 'vitest'
import { MAX_RESULT_CHARS, clipResult, redactSensitive, sourceCheckMessage } from './source-check'

const t = (key: string, values: Record<string, string> = {}) => `${key}${Object.keys(values).length ? ` ${JSON.stringify(values)}` : ''}`

describe('source-check message', () => {
  it('strips contact details and secrets but keeps addresses', () => {
    const text = redactSensitive('Số 1 Kim Mã, Ba Đình — gọi 0912 345 678, mail a.b@lpc.vn, token=abc123, http://10.0.0.5/x')
    expect(text).toBe('Số 1 Kim Mã, Ba Đình — gọi [phone], mail [email], […], […]')
  })

  it('clips long results', () => {
    const clipped = clipResult('x'.repeat(MAX_RESULT_CHARS + 50))
    expect(clipped).toHaveLength(MAX_RESULT_CHARS + 1)
    expect(clipped.endsWith('…')).toBe(true)
  })

  it('names the package in use and leaves the result out unless given', () => {
    const base = { tool: 'Tiền điện', toolId: 'tien-dien', domain: 'electricity', kinds: ['electricity', 'vat'] }
    const withSnapshot = sourceCheckMessage({ ...base, snapshot: { id: 'abc', effectiveFrom: '2025-05-10', sourceTitle: 'QĐ 1279', sourceUrl: 'https://evn.com.vn/x' }, result: null }, t)
    expect(withSnapshot).toContain('sourceCheck.message.snapshot {"date":"2025-05-10","title":"QĐ 1279","url":"https://evn.com.vn/x"}')
    expect(withSnapshot).toContain('"kinds":"electricity, vat"')
    expect(withSnapshot).not.toContain('sourceCheck.message.result')
    const withResult = sourceCheckMessage({ ...base, snapshot: null, result: '  250 kWh: 600.000 đ, gọi 0912345678 ' }, t)
    expect(withResult).toContain('sourceCheck.message.noSnapshot')
    expect(withResult).toContain('sourceCheck.message.result {"result":"250 kWh: 600.000 đ, gọi [phone]"}')
  })
})
