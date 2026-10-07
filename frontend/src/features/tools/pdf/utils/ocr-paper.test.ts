import { describe, expect, it } from 'vitest'
import { detectPaperCorners } from './ocr-paper'

describe('conservative automatic paper correction', () => {
  it('does not infer perspective from a white scan or a rectangular paper', () => {
    const image = { width: 120, height: 120, data: new Uint8Array(14400).fill(255) }
    expect(detectPaperCorners(image)).toBeNull()
    image.data.fill(70)
    for (let y = 20; y <= 100; y++) for (let x = 20; x <= 100; x++) image.data[y * 120 + x] = 255
    expect(detectPaperCorners(image)).toBeNull()
  })
  it('requires supported paper edges on a separated background', () => {
    const image = { width: 120, height: 120, data: new Uint8Array(14400).fill(70) }
    for (let y = 20; y <= 100; y++) for (let x = Math.round(30-(y-20)/8); x <= Math.round(90+(y-20)/8); x++) image.data[y * 120 + x] = 255
    expect(detectPaperCorners(image)?.[0].x).toBeCloseTo(.25)
    expect(detectPaperCorners(image)?.[2].x).toBeCloseTo(100/120)
    image.data.fill(255, 0, 120)
    expect(detectPaperCorners(image)).toBeNull()
  })
})
