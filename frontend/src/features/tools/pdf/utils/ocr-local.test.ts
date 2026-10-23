import { describe, expect, it } from 'vitest'
import { localOcrAngle, localOcrPixels, ocrStrips, uniqueOcrLines } from './ocr-local'
import type { OcrLine } from './ocr-runs'

describe('local printed OCR preparation', () => {
  it('removes duplicate crop-boundary detections while retaining genuinely repeated lines', () => {
    const line = (y: number, confidence: number): OcrLine => ({ bbox: { x0: 20, y0: y, x1: 180, y1: y + 20 }, baseline: { x0: 20, y0: y + 16, x1: 180, y1: y + 16 }, words: [{ text: 'Cách mạng.', confidence, bbox: { x0: 20, y0: y, x1: 180, y1: y + 20 } }] })
    const result = uniqueOcrLines([line(100, 80), line(103, 95), line(150, 90)])
    expect(result).toHaveLength(2)
    expect(result[0].words[0].confidence).toBe(95)
    expect(result[1].bbox.y0).toBe(150)
  })
  it('does not let a differently recognized context fragment overwrite a complete owned line', () => {
    const whole: OcrLine = { bbox: { x0: 20, y0: 100, x1: 180, y1: 120 }, baseline: { x0: 20, y0: 116, x1: 180, y1: 116 }, words: [{ text: 'Một dòng hoàn chỉnh', confidence: 92, bbox: { x0: 20, y0: 100, x1: 180, y1: 120 } }] }
    const fragment = { ...whole, words: [{ ...whole.words[0], text: 'dòng hoan chinh', confidence: 99 }] }
    expect(uniqueOcrLines([whole, fragment], true)).toEqual([whole])
    const next = { ...whole, bbox: { ...whole.bbox, y0: 135, y1: 155 }, baseline: { ...whole.baseline, y0: 151, y1: 151 } }
    expect(uniqueOcrLines([whole, next], true)).toHaveLength(2)
  })
  it('removes uneven paper shading and light highlighter without erasing black text', () => {
    const width = 160, height = 90, input = new Uint8ClampedArray(width * height * 4)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, paper = Math.round(150 + x / width * 90)
      const ink = y >= 40 && y < 45 && x > 10 && x < 150
      input.set(ink ? [30, 30, 30, 255] : y > 35 && y < 55 ? [100, 180, 210, 255] : [paper, paper, paper, 255], i)
    }
    const original = new Uint8ClampedArray(input), output = localOcrPixels(input, width, height)
    expect(input).toEqual(original)
    expect(output[(42 * width + 80) * 4]).toBe(0)
    expect(output[(50 * width + 80) * 4]).toBe(255)
    expect(output[(15 * width + 8) * 4]).toBe(255)
    expect(output[(15 * width + 150) * 4]).toBe(255)
  })
  it('measures opposite local slopes on a curved page and leaves a blank image straight', () => {
    const image = (angle: number) => {
      const width = 512, height = 220, data = new Uint8Array(width * height).fill(255)
      for (let line = 30; line < 180; line += 35) for (let x = 15; x < 497; x++) {
        const y = Math.round(line + Math.tan(angle * Math.PI / 180) * (x - width / 2))
        if (x % 14 < 8) for (let dy = 0; dy < 4; dy++) data[(y + dy) * width + x] = 20
      }
      return { width, height, data }
    }
    expect(localOcrAngle(image(2.5))).toBeCloseTo(-2.5)
    expect(localOcrAngle(image(-2))).toBeCloseTo(2)
    expect(localOcrAngle(image(-8.25))).toBeCloseTo(8.25)
    expect(localOcrAngle({ width: 512, height: 220, data: new Uint8Array(512 * 220).fill(255) })).toBe(0)
  })
  it('provides overlapping reading context with non-overlapping line ownership across the entire page', () => {
    const strips = ocrStrips(1282, 1908)
    expect(strips[0].top).toBe(0)
    expect(strips.at(-1)!.top + strips.at(-1)!.height).toBe(1908)
    for (let y = 0; y < 1908; y++) expect(strips.filter(strip => y >= strip.start && y < strip.end)).toHaveLength(1)
    for (let i = 1; i < strips.length; i++) expect(strips[i].top).toBeLessThan(strips[i - 1].top + strips[i - 1].height)
  })
})
