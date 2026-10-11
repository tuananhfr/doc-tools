import { describe, expect, it } from 'vitest'
import { suppressRulingPixels } from './ocr-image-variants'

describe('OCR ruling suppression', () => {
  it('uses sampled geometry when a transformed separator drifts across raster rows', () => {
    const sample = { width: 120, height: 120, data: new Uint8Array(14400).fill(255) }
    for (const y of [10, 50, 90]) for (let x = 5; x <= 115; x++) sample.data[y * 120 + x] = 0
    for (const x of [5, 60, 115]) for (let y = 10; y <= 90; y++) sample.data[y * 120 + x] = 0
    const input = new Uint8ClampedArray(240 * 240 * 4).fill(255)
    for (const y of [20, 100, 180]) for (let x = 10; x <= 230; x++) {
      const offset = ((y + Math.round(x / 80)) * 240 + x) * 4
      input[offset] = input[offset + 1] = input[offset + 2] = 0
    }
    const output = suppressRulingPixels(input, 240, 240, sample)
    expect(output[(102 * 240 + 160) * 4]).toBe(255)
    expect(input[(102 * 240 + 160) * 4]).toBe(0)
  })
  it('removes isolated junctions while retaining a glyph crossing a separator', () => {
    const width = 120, height = 120, input = new Uint8ClampedArray(width * height * 4).fill(255)
    const dark = (x: number, y: number) => { const offset = (y * width + x) * 4; input[offset] = input[offset + 1] = input[offset + 2] = 0 }
    for (const y of [10, 50, 90]) for (let x = 5; x <= 115; x++) dark(x, y)
    for (const x of [5, 60, 115]) for (let y = 10; y <= 90; y++) dark(x, y)
    for (let x = 55; x <= 65; x++) for (let y = 25; y <= 30; y++) dark(x, y)
    const output = suppressRulingPixels(input, width, height)
    expect(output[(50 * width + 60) * 4]).toBe(255)
    expect(output[(27 * width + 60) * 4]).toBe(0)
    expect(input[(50 * width + 60) * 4]).toBe(0)
  })
  it('does not erase isolated strokes from text without a ruled grid', () => {
    const input = new Uint8ClampedArray(80 * 80 * 4).fill(255)
    for (let y = 20; y < 50; y++) input[(y * 80 + 30) * 4] = 0
    expect(suppressRulingPixels(input, 80, 80)).toEqual(input)
  })
})
