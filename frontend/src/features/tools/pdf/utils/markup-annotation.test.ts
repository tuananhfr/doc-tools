import { describe, expect, it } from 'vitest'
import type { Markup } from '../types/markup.types'
import { annotationSpec } from './markup-annotation'

describe('annotationSpec', () => {
  it('maps shapes to their PDF annotation types', () => {
    const box = { x: 10, y: 20, width: 30, height: 40 }
    expect(annotationSpec({ id: 'a', kind: 'rect', color: 'red', width: 2, box })).toMatchObject({ subtype: 'Square', border: 2, cloudy: false })
    expect(annotationSpec({ id: 'a', kind: 'cloud', color: 'red', width: 2, box })).toMatchObject({ subtype: 'Square', cloudy: true })
    expect(annotationSpec({ id: 'a', kind: 'ellipse', color: 'red', width: 1, box })?.subtype).toBe('Circle')
    expect(annotationSpec({ id: 'a', kind: 'arrow', color: 'red', width: 1, from: { x: 0, y: 0 }, to: { x: 5, y: 5 } })).toMatchObject({
      subtype: 'Line',
      line: { arrow: true },
    })
    expect(annotationSpec({ id: 'a', kind: 'pen', color: 'red', width: 1, points: [{ x: 0, y: 0 }] })?.ink).toEqual([[{ x: 0, y: 0 }]])
  })

  it('gives text markups their quad in reading order', () => {
    const frame = { origin: { x: 100, y: 50 }, turn: 90 as const, width: 60, height: 12 }
    const spec = annotationSpec({ id: 'u', kind: 'underline', color: 'blue', width: 1, frame })
    // Turn 90: text runs upward, so "top-right" is 60 pt above the origin.
    expect(spec?.quads?.[0]).toEqual([
      { x: 100, y: 50 },
      { x: 100, y: -10 },
      { x: 112, y: 50 },
      { x: 112, y: -10 },
    ])
  })

  it('keeps the text of notes and stamps, and always flattens text edits', () => {
    const frame = { origin: { x: 0, y: 0 }, turn: 0 as const, width: 10, height: 10 }
    expect(annotationSpec({ id: 'n', kind: 'note', color: 'yellow', text: 'Kiểm tra lại', frame })).toMatchObject({ subtype: 'Text', contents: 'Kiểm tra lại' })
    expect(annotationSpec({ id: 's', kind: 'stamp', preset: 'approved', date: '01/10/2026', frame })).toMatchObject({ subtype: 'Stamp', stampName: 'Approved' })
    const edit: Markup = {
      id: 'e',
      kind: 'textEdit',
      frame,
      cover: { width: 10, height: 10 },
      text: '',
      lines: [],
      fontSize: 10,
      baseline: 8,
      inset: 1,
      font: { serif: false, bold: false, italic: false },
      ink: [0, 0, 0],
      fill: [1, 1, 1],
    }
    expect(annotationSpec(edit)).toBeNull()
  })
})
