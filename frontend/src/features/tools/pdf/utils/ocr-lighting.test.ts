import { expect, it } from 'vitest'
import { normalizeOcrLighting } from './ocr-lighting'

it('keeps faint dot/diacritic gradation while removing a smooth paper shadow', () => {
  const w = 80, h = 40, input = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = (y * w + x) * 4, value = 145 + x
    input.set([value, value, value, 255], p)
  }
  const dot = (12 * w + 40) * 4
  input.set([160, 160, 160, 255], dot)
  const output = normalizeOcrLighting(input, w, h)
  expect(output[dot]).toBeGreaterThan(0)
  expect(output[dot]).toBeLessThan(230)
  expect(output[dot - 4]).toBeGreaterThan(245)
  expect(output[dot + 3]).toBe(255)
  expect(input[dot]).toBe(160)
})

it('suppresses a coloured highlighter without erasing black printed ink', () => {
  const input = new Uint8ClampedArray(20 * 20 * 4)
  for (let p = 0; p < input.length; p += 4) input.set([255, 220, 80, 255], p)
  const center = (10 * 20 + 10) * 4; input.set([40, 40, 40, 255], center)
  const output = normalizeOcrLighting(input, 20, 20)
  expect(output[0]).toBe(255)
  expect(output[center]).toBeLessThan(50)
})
