import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { QR_BACKGROUND_COLORS, qrBackgroundColor, qrContrast } from '../config/qr-colors'
import type { QrMatrix } from '../types/qr.types'
import { qrPdfBlob, qrSvgBlob } from './qr-render'

const matrix: QrMatrix = { size: 2, dark: (column, row) => column === row }

describe('QR backgrounds', () => {
  it('keeps transparent, white and custom choices distinct', () => {
    expect(qrBackgroundColor({ mode: 'transparent', color: '#ff0000' })).toBeNull()
    expect(qrBackgroundColor({ mode: 'white', color: '#ff0000' })).toBe('#FFFFFF')
    expect(qrBackgroundColor({ mode: 'custom', color: '#ff0000' })).toBe('#ff0000')
    expect(qrContrast('#101820', '#ffffff')).toBeGreaterThan(4.5)
    expect(qrContrast('#ffffff', '#ffffff')).toBe(1)
    expect(QR_BACKGROUND_COLORS).toHaveLength(6)
    for (const preset of QR_BACKGROUND_COLORS) expect(qrContrast('#101820', preset.value)).toBeGreaterThan(4.5)
  })

  it('omits the SVG background only for transparency', async () => {
    expect(await qrSvgBlob(matrix, '#101820', null).text()).not.toContain('<rect')
    expect(await qrSvgBlob(matrix, '#101820', '#ff0000').text()).toContain('fill="#ff0000"')
  })

  it('creates a one-page vector PDF for either background choice', async () => {
    for (const background of [null, '#ff0000']) {
      const blob = await qrPdfBlob(matrix, '#101820', background)
      const doc = await PDFDocument.load(await blob.arrayBuffer())
      expect(blob.type).toBe('application/pdf')
      expect(doc.getPageCount()).toBe(1)
      expect(doc.getPage(0).getSize()).toEqual({ width: 288, height: 288 })
    }
  })
})
