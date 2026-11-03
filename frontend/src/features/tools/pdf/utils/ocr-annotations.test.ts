import { expect, it } from 'vitest'
import { neutralPrintedPixels } from './ocr-annotations'
it('suppresses colored ink only in a separate candidate, preserving black strokes and warm paper', () => {
  const raw = new Uint8ClampedArray([160, 110, 110, 255, 80, 70, 150, 255, 45, 40, 40, 255, 190, 180, 160, 255])
  const result = neutralPrintedPixels(raw)
  expect(result.changed).toBe(2)
  expect(Array.from(result.pixels.slice(0, 8))).toEqual(Array(8).fill(255))
  expect(result.pixels.slice(8)).toEqual(raw.slice(8))
  expect(raw[0]).toBe(160)
})
