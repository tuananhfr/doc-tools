import { describe, expect, it } from 'vitest'
import { FULL_SCAN_CORNERS, isWholeScanImage, scanColor, scanGeometry } from './document-scan'
import { transformPoint } from './ocr-transform'
import { detectPaperCorners } from './ocr-paper'

describe('document scan geometry and content guards', () => {
  it('distinguishes keeping the full photograph from selecting document edges', () => {
    expect(isWholeScanImage(FULL_SCAN_CORNERS)).toBe(true)
    expect(isWholeScanImage(FULL_SCAN_CORNERS.map(p => ({ x: .1 + p.x * .8, y: .1 + p.y * .8 })) as typeof FULL_SCAN_CORNERS)).toBe(false)
  })
  it('maps a trapezoid to all four edges of the output without mirroring', () => {
    const corners = [{ x: .25, y: .1 }, { x: .8, y: .15 }, { x: .9, y: .9 }, { x: .1, y: .8 }] as typeof FULL_SCAN_CORNERS
    const result = scanGeometry(corners, 1200, 900), pad = result.padding
    const targets = [{ x: pad, y: pad }, { x: result.width-pad-1, y: pad }, { x: result.width-pad-1, y: result.height-pad-1 }, { x: pad, y: result.height-pad-1 }]
    targets.forEach((p, i) => { const mapped = transformPoint(result.toSource, p); expect(mapped.x).toBeCloseTo(corners[i].x * 1199); expect(mapped.y).toBeCloseTo(corners[i].y * 899) })
  })
  it('rejects crossed corners rather than silently cropping an invalid shape', () => {
    expect(() => scanGeometry([FULL_SCAN_CORNERS[0], FULL_SCAN_CORNERS[2], FULL_SCAN_CORNERS[1], FULL_SCAN_CORNERS[3]], 1000, 1000)).toThrow('SCAN_INVALID_CORNERS')
  })
  it('preserves red/blue ink and faint stroke gradation in color presets', () => {
    for (const preset of ['auto', 'white', 'color'] as const) {
      expect(scanColor(190, 20, 30, preset)).toEqual([190, 20, 30]); expect(scanColor(20, 40, 180, preset)).toEqual([20, 40, 180])
      expect(scanColor(210, 210, 210, preset)[0]).toBeLessThan(scanColor(240, 240, 240, preset)[0])
    }
  })
  it('finds straight paper for scanning while leaving legacy OCR detection conservative', () => {
    const image = { width: 120, height: 120, data: new Uint8Array(14400).fill(50) }
    for (let y = 20; y <= 100; y++) for (let x = 20; x <= 100; x++) image.data[y * 120 + x] = 255
    expect(detectPaperCorners(image)).toBeNull(); expect(detectPaperCorners(image, true)).not.toBeNull()
  })
})
