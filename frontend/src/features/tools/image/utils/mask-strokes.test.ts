import { describe, expect, it } from 'vitest'
import { composeMask, newStrokeEdit, paintStroke, pushStroke, STROKE_ERASE, STROKE_KEEP, STROKE_NONE, undoStroke } from './mask-strokes'

describe('mask strokes', () => {
  it('strokes override the auto mask, so re-detecting the background keeps them', () => {
    const strokes = new Uint8Array(9)
    paintStroke(strokes, 3, 3, 0, 0, 0, STROKE_KEEP, newStrokeEdit())
    paintStroke(strokes, 3, 3, 2, 2, 0, STROKE_ERASE, newStrokeEdit())
    // Hai lần dò với độ nhạy khác nhau: nét cọ vẫn thắng ở cả hai.
    for (const auto of [new Uint8Array(9).fill(0), new Uint8Array(9).fill(1)]) {
      const mask = composeMask(auto, strokes)
      expect(mask[0]).toBe(1)
      expect(mask[8]).toBe(0)
      expect(mask[4]).toBe(auto[4])
    }
  })

  it('undoes strokes one by one in reverse order', () => {
    const strokes = new Uint8Array(25)
    let history = pushStroke([], (() => { const edit = newStrokeEdit(); paintStroke(strokes, 5, 5, 2, 2, 1, STROKE_ERASE, edit); return edit })())
    history = pushStroke(history, (() => { const edit = newStrokeEdit(); paintStroke(strokes, 5, 5, 2, 2, 0, STROKE_KEEP, edit); return edit })())
    expect(history).toHaveLength(2)
    expect(strokes[12]).toBe(STROKE_KEEP)
    expect(strokes[7]).toBe(STROKE_ERASE)
    undoStroke(strokes, history.pop()!)
    expect(strokes[12]).toBe(STROKE_ERASE)
    expect(strokes[7]).toBe(STROKE_ERASE)
    undoStroke(strokes, history.pop()!)
    expect([...strokes].every((value) => value === STROKE_NONE)).toBe(true)
  })

  it('records the value before the stroke even when a stroke passes a pixel twice', () => {
    const strokes = new Uint8Array(9)
    const edit = newStrokeEdit()
    paintStroke(strokes, 3, 3, 1, 1, 0, STROKE_ERASE, edit)
    paintStroke(strokes, 3, 3, 1, 1, 0, STROKE_ERASE, edit)
    expect(edit.previous.get(4)).toBe(STROKE_NONE)
    undoStroke(strokes, edit)
    expect(strokes[4]).toBe(STROKE_NONE)
  })

  it('drops empty strokes and caps the history', () => {
    expect(pushStroke([], newStrokeEdit())).toEqual([])
    const filled = () => { const edit = newStrokeEdit(); edit.previous.set(0, 0); return edit }
    let history = [filled(), filled()]
    const last = filled()
    history = pushStroke(history, last, 2)
    expect(history).toHaveLength(2)
    expect(history[1]).toBe(last)
  })
})
