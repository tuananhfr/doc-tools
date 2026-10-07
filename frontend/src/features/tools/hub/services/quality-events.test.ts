import { afterEach, describe, expect, it, vi } from 'vitest'
import { qualityConsent, recordQualityEvent, setQualityConsent } from './quality-events'

afterEach(() => { setQualityConsent(false); vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('optional finite quality events', () => {
  it('sends nothing until both the feature flag and session consent are enabled', () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch)
    vi.stubEnv('NEXT_PUBLIC_QUALITY_EVENTS', '0'); setQualityConsent(true)
    recordQualityEvent('download', 'ocr'); expect(qualityConsent()).toBe(false)
    vi.stubEnv('NEXT_PUBLIC_QUALITY_EVENTS', '1'); recordQualityEvent('download', 'ocr')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('sends only a finite pair without credentials, query text or referrer', () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch)
    vi.stubEnv('NEXT_PUBLIC_QUALITY_EVENTS', '1'); setQualityConsent(true)
    recordQualityEvent('download', 'ocr')
    const options = fetch.mock.calls[0][1]
    expect(JSON.parse(options.body)).toEqual({ event: 'download', tool: 'ocr' })
    expect(options).toMatchObject({ credentials: 'omit', referrerPolicy: 'no-referrer' })
    recordQualityEvent('zero-result', 'ocr'); recordQualityEvent('download', 'secret-file')
    recordQualityEvent('private-query' as 'download', 'ocr')
    expect(fetch).toHaveBeenCalledTimes(1)
  })
  it('stops immediately when consent is revoked', () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true }); vi.stubGlobal('fetch', fetch)
    vi.stubEnv('NEXT_PUBLIC_QUALITY_EVENTS', '1'); setQualityConsent(true); setQualityConsent(false)
    recordQualityEvent('zero-result'); expect(fetch).not.toHaveBeenCalled()
  })
})
