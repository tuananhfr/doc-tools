import { expect, it } from 'vitest'
import { ocrQuality } from './ocr-quality'

it('flags a blank and low-resolution page without claiming recognition accuracy', () => {
  expect(ocrQuality({ width: 40, height: 40, data: new Uint8Array(1600).fill(255) }, { width: 200, height: 300 })).toEqual(expect.arrayContaining(['blank', 'low-resolution', 'low-contrast']))
})
it('does not mark a sharp high-contrast synthetic pattern as blurred', () => {
  const data = Uint8Array.from({ length: 1600 }, (_, i) => i % 3 === 0 ? 0 : 255)
  expect(ocrQuality({ width: 40, height: 40, data })).not.toContain('blur')
})
