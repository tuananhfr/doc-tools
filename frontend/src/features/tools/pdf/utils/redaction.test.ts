import { describe, expect, it } from 'vitest'
import type { Markup } from '../types/markup.types'
import type { TextRun } from '../types/text-layer.types'
import { annotationSpec } from './markup-annotation'
import { drawnMarkup, restyledMarkup, snappedMarkups, styleOfMarkup, type MarkupStyle } from './markup-draft'
import { markupPrimitives } from './markup-geometry'
import { canvasRedactRects, hasRedactions, redactBoxes, runBounds, runsOutside } from './redaction'

const style: MarkupStyle = { color: 'red', width: 2, preset: 'approved' }

function run(text: string, x: number, y: number, width: number, angle = 0): TextRun {
  return { text, origin: { x, y }, angle, size: 10, width, ascent: 0.8, descent: 0.2, fontName: 'f', fontFamily: 'sans-serif', eol: false }
}

describe('redact markup', () => {
  it('is drawn as a solid black box and never becomes an annotation', () => {
    const box = drawnMarkup('redact', 'x', style, [{ x: 10, y: 20 }, { x: 110, y: 40 }], { base: { width: 600, height: 800 }, rotation: 0 })
    expect(box).toEqual({ id: 'x', kind: 'redact', box: { x: 10, y: 20, width: 100, height: 20 } })
    expect(markupPrimitives(box)).toEqual([expect.objectContaining({ type: 'path', fill: [0, 0, 0] })])
    expect(annotationSpec(box)).toBeNull()
  })

  it('snaps to text lines and ignores colour changes', () => {
    const [line] = snappedMarkups('redact', 'r', style, [{ start: { x: 50, y: 100 }, angle: 0, length: 80, top: -8, bottom: 2, text: 'STK', size: 10, run: 0 }])
    expect(line).toEqual({ id: 'r-0', kind: 'redact', box: { x: 50, y: 92, width: 80, height: 10 } })
    expect(restyledMarkup(line, { color: 'yellow' }, null)).toBe(line)
    expect(styleOfMarkup(line)).toEqual({})
  })
})

describe('redactBoxes', () => {
  it('collects only redact boxes', () => {
    const markups: Markup[] = [
      { id: 'h', kind: 'highlight', color: 'yellow', box: { x: 0, y: 0, width: 5, height: 5 } },
      { id: 'r', kind: 'redact', box: { x: 1, y: 2, width: 3, height: 4 } },
    ]
    expect(redactBoxes(markups)).toEqual([{ x: 1, y: 2, width: 3, height: 4 }])
    expect(hasRedactions([{ markups }, {}])).toBe(true)
    expect(hasRedactions([{ markups: markups.slice(0, 1) }])).toBe(false)
  })
})

describe('runsOutside', () => {
  it('measures a run from descent to ascent along its baseline', () => {
    expect(runBounds(run('Hợp đồng', 100, 200, 40))).toEqual({ x: 100, y: 192, width: 40, height: 10 })
    // Chữ dọc (90° ngược kim đồng hồ) chạy lên trên từ gốc.
    const vertical = runBounds(run('dọc', 100, 200, 40, 90))
    expect(vertical.x).toBeCloseTo(92)
    expect(vertical.y).toBeCloseTo(160)
    expect(vertical.width).toBeCloseTo(10)
    expect(vertical.height).toBeCloseTo(40)
  })

  it('drops every run touching a box, keeps the rest', () => {
    const runs = [run('Số tài khoản 0123456789', 50, 100, 150), run('Ngân hàng', 50, 130, 60), run('Ghi chú', 300, 100, 40)]
    const kept = runsOutside(runs, [{ x: 140, y: 90, width: 60, height: 12 }])
    expect(kept.map((item) => item.text)).toEqual(['Ngân hàng', 'Ghi chú'])
  })

  it('treats a run grazing the edge as redacted', () => {
    const runs = [run('sát mép', 50, 100, 40)]
    // Mảnh chữ kết thúc ở x = 90, khung bắt đầu ở x = 90.5 — vẫn trong biên an toàn.
    expect(runsOutside(runs, [{ x: 90.5, y: 80, width: 20, height: 30 }])).toEqual([])
    expect(runsOutside(runs, [])).toBe(runs)
  })
})

describe('canvasRedactRects', () => {
  it('maps a base-frame box onto a canvas rendered with an extra turn', () => {
    // Trang 600×800 xoay phải, vẽ ở 2 px/pt: canvas 1600×1200.
    const [rect] = canvasRedactRects([{ x: 50, y: 500, width: 100, height: 200 }], { width: 600, height: 800 }, 90, { width: 1600, height: 1200 })
    // Khung gốc (50, 500)-(150, 700) → nhìn thấy (100, 50)-(300, 150), nới 1px mỗi phía.
    expect(rect).toEqual({ x: 199, y: 99, width: 402, height: 202 })
  })
})
