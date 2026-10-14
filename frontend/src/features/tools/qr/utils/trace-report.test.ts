import { describe, expect, it } from 'vitest'
import { QR_TEXT_MAX } from '@/features/embed/embed-protocol'
import { traceReportText } from './trace-report'

describe('traceReportText', () => {
  it.each(['LOT-2026-001', 'https://lpc.vn/t/AbC123', '8935001234567'])('reports %s as-is', (text) => {
    expect(traceReportText(text)).toBe(text)
  })
  it.each(['WIFI:S:home;T:WPA;P:secret;;', 'tel:0900000000', 'mailto:a@b.vn', '', '   '])('skips %s', (text) => {
    expect(traceReportText(text)).toBeNull()
  })
  it('cuts to the host trace limit', () => {
    expect(traceReportText('x'.repeat(QR_TEXT_MAX + 500))).toHaveLength(QR_TEXT_MAX)
  })
})
