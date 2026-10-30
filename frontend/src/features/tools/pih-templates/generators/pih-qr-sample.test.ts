import { describe, expect, it } from 'vitest'
import { buildPayload, INITIAL_QR_FORM } from '@/features/tools/qr/utils/qr-payload'
import { createMatrix } from '@/features/tools/qr/utils/qr-matrix'
import { PIH_QR_SAMPLE_PATCH } from './pih-qr-sample'

describe('pih-qr-sample', () => {
  it('encodes through the real QR payload builder and is clearly labeled as demo content', () => {
    const form = { ...INITIAL_QR_FORM, ...PIH_QR_SAMPLE_PATCH }
    const payload = buildPayload(form)
    expect(payload.ok).toBe(true)
    if (!payload.ok) return
    expect(payload.text).toContain('DEMO')
    expect(payload.text).not.toMatch(/^https?:\/\//) // text kind, not a URL — nothing to fetch/scan-resolve
  })

  it('produces a scannable matrix (not too long for a QR code)', () => {
    const form = { ...INITIAL_QR_FORM, ...PIH_QR_SAMPLE_PATCH }
    const payload = buildPayload(form)
    expect(payload.ok).toBe(true)
    if (!payload.ok) return
    const matrix = createMatrix(payload.text)
    expect(matrix).not.toBeNull()
  })
})
