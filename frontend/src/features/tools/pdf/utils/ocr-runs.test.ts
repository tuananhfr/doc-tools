import { describe, expect, it } from 'vitest'
import { ocrRuns, type OcrLine } from './ocr-runs'
import { visualToBase } from './page-geometry'

const line: OcrLine = {
  bbox: { x0: 100, y0: 200, x1: 500, y1: 250 },
  baseline: { x0: 100, y0: 240, x1: 500, y1: 240 },
  rowAttributes: { rowHeight: 38, descenders: -12 },
  words: [
    { text: 'Biên', confidence: 91, bbox: { x0: 100, y0: 200, x1: 200, y1: 250 } },
    { text: '~~', confidence: 12, bbox: { x0: 210, y0: 200, x1: 240, y1: 250 } },
    { text: 'bản', confidence: 88, bbox: { x0: 260, y0: 200, x1: 340, y1: 250 } },
  ],
}

describe('ocrRuns', () => {
  it('converts pixels to points and drops low-confidence noise', () => {
    const runs = ocrRuns([line], 2, (point) => point)
    expect(runs.map((run) => run.text)).toEqual(['Biên', 'bản'])
    expect(runs[0]).toMatchObject({ origin: { x: 50, y: 120 }, width: 50, size: 25, angle: 0, eol: false })
    expect(runs[1].eol).toBe(true)
  })

  it('maps text read on a page the user turned 90° back to the base frame', () => {
    // Khung gốc 400 × 600 pt; người dùng xoay 90° nên khung đang nhìn là 600 × 400.
    const base = { width: 400, height: 600 }
    const [run] = ocrRuns([line], 1, (point) => visualToBase(point, base, 90))
    // Chữ ngang trên khung nhìn chạy từ dưới lên ở khung gốc: góc +90° (ngược chiều kim đồng hồ).
    expect(Math.round(run.angle)).toBe(90)
    expect(run.width).toBeCloseTo(100)
    expect(run.origin).toEqual(visualToBase({ x: 100, y: 240 }, base, 90))
  })
})
