import { describe, expect, it } from 'vitest'
import type { Markup, OrientedBox } from '../types/markup.types'
import {
  cloudSegs,
  markupAt,
  markupBounds,
  markupHandles,
  markupPrimitives,
  moveMarkup,
  orientedBounds,
  orientedFromBounds,
  orientedPoint,
  resizeMarkup,
  simplifyStroke,
  stampFrameSize,
  textFrameSize,
  type TextPrim,
} from './markup-geometry'
import type { QuarterTurn } from './page-geometry'

const rect: Markup = { id: 'r', kind: 'rect', color: 'red', width: 2, box: { x: 100, y: 100, width: 200, height: 100 } }
const line: Markup = { id: 'l', kind: 'line', color: 'blue', width: 2, from: { x: 0, y: 0 }, to: { x: 100, y: 0 } }
const measure = (text: string, size: number) => text.length * size * 0.5

describe('oriented frames', () => {
  const turns: QuarterTurn[] = [0, 90, 180, 270]
  const box = { x: 10, y: 20, width: 30, height: 40 }

  it('round-trips a base box through every turn', () => {
    for (const turn of turns) expect(orientedBounds(orientedFromBounds(box, turn))).toEqual(box)
  })

  it('runs text upwards on a page the user turned 90°', () => {
    const frame: OrientedBox = { origin: { x: 50, y: 200 }, turn: 90, width: 80, height: 20 }
    expect(orientedPoint(frame, 80, 0)).toEqual({ x: 50, y: 120 })
    expect(orientedPoint(frame, 0, 20)).toEqual({ x: 70, y: 200 })
  })
})

describe('markupPrimitives', () => {
  it('draws an arrow as shaft plus head', () => {
    const [prim] = markupPrimitives({ ...line, kind: 'arrow' })
    expect(prim.type === 'path' && prim.segs.filter((seg) => seg.op === 'M')).toHaveLength(2)
  })

  it('lays out text lines along the frame and keeps its turn', () => {
    const prims = markupPrimitives({
      id: 't',
      kind: 'text',
      color: 'black',
      fontSize: 10,
      text: 'Dòng 1\nDòng 2',
      frame: { origin: { x: 0, y: 0 }, turn: 0, width: 50, height: 25 },
    }) as TextPrim[]
    expect(prims.map((prim) => prim.at.y)).toEqual([9, 22])
    expect(prims[0].angle).toBe(0)
  })

  it('underlines at the bottom as the user saw it, strikes through the middle', () => {
    const frame: OrientedBox = { origin: { x: 0, y: 0 }, turn: 0, width: 100, height: 20 }
    const [under] = markupPrimitives({ id: 'u', kind: 'underline', color: 'red', width: 2, frame })
    const [strike] = markupPrimitives({ id: 's', kind: 'strikeout', color: 'red', width: 2, frame })
    expect(under.type === 'path' && under.segs[0]).toMatchObject({ p: { y: 19 } })
    expect(strike.type === 'path' && strike.segs[0]).toMatchObject({ p: { y: 10 } })
  })

  it('closes the cloud outline with bumps on every side', () => {
    const segs = cloudSegs({ x: 0, y: 0, width: 120, height: 60 })
    expect(segs.at(-1)).toEqual({ op: 'Z' })
    expect(segs.filter((seg) => seg.op === 'C').length).toBeGreaterThanOrEqual(8)
  })
})

describe('hit testing', () => {
  it('picks the outline of a rectangle but not its empty middle', () => {
    expect(markupAt([rect], { x: 101, y: 150 }, 3)?.id).toBe('r')
    expect(markupAt([rect], { x: 200, y: 150 }, 3)).toBeUndefined()
  })

  it('returns the topmost markup', () => {
    const top: Markup = { id: 'h', kind: 'highlight', color: 'yellow', box: { x: 90, y: 140, width: 50, height: 20 } }
    expect(markupAt([rect, top], { x: 101, y: 150 }, 3)?.id).toBe('h')
  })
})

describe('editing', () => {
  it('moves every kind by the same delta', () => {
    expect(markupBounds(moveMarkup(rect, 5, -5))).toEqual({ x: 105, y: 95, width: 200, height: 100 })
    expect(moveMarkup(line, 1, 1)).toMatchObject({ from: { x: 1, y: 1 }, to: { x: 101, y: 1 } })
  })

  it('resizes from a corner keeping the opposite one fixed', () => {
    expect(resizeMarkup(rect, 'se', { x: 400, y: 300 })).toMatchObject({ box: { x: 100, y: 100, width: 300, height: 200 } })
    expect(resizeMarkup(rect, 'nw', { x: 350, y: 250 })).toMatchObject({ box: { x: 300, y: 200, width: 50, height: 50 } })
  })

  it('keeps the orientation of a stamp while resizing', () => {
    const stamp: Markup = { id: 's', kind: 'stamp', preset: 'approved', date: '', frame: { origin: { x: 0, y: 100 }, turn: 90, width: 100, height: 40 } }
    const resized = resizeMarkup(stamp, 'se', { x: 60, y: 100 })
    expect(resized.kind === 'stamp' && resized.frame).toMatchObject({ turn: 90, width: 100, height: 60 })
  })

  it('offers no handles for free-hand strokes, only a width handle for text', () => {
    expect(markupHandles({ id: 'p', kind: 'pen', color: 'red', width: 1, points: [{ x: 0, y: 0 }] })).toEqual([])
    expect(markupHandles(rect)).toHaveLength(4)
    const text: Markup = { id: 't', kind: 'text', color: 'red', fontSize: 10, text: 'ab', frame: { origin: { x: 10, y: 20 }, turn: 0, width: 40, height: 12 } }
    expect(markupHandles(text)).toEqual([{ id: 'end', p: { x: 50, y: 26 } }])
  })

  it('widens a text box along its own direction, never narrower than three letters', () => {
    const text: Markup = { id: 't', kind: 'text', color: 'red', fontSize: 10, text: 'ab', frame: { origin: { x: 100, y: 100 }, turn: 90, width: 40, height: 12 } }
    // turn 90: chữ chạy NGƯỢC trục y gốc — kéo lên trên mới là kéo rộng, kéo ngang không đổi gì.
    const wide = resizeMarkup(text, 'end', { x: 999, y: -20 })
    expect(wide).toMatchObject({ wrap: 120, frame: { width: 120, height: 12 } })
    expect(resizeMarkup(text, 'end', { x: 100, y: 99 })).toMatchObject({ wrap: 30 })
    const note: Markup = { id: 'n', kind: 'note', color: 'red', text: 'ab', frame: { origin: { x: 0, y: 0 }, turn: 0, width: 40, height: 30 } }
    // Ghi chú: bề rộng ngắt dòng không gồm lề hai bên.
    expect(resizeMarkup(note, 'end', { x: 112, y: 0 })).toMatchObject({ wrap: 100, frame: { width: 112 } })
  })

  it('draws the wrapped lines of a widened text box', () => {
    const text: Markup = { id: 't', kind: 'text', color: 'red', fontSize: 10, text: 'một hai', wrap: 20, lines: ['một', 'hai'], frame: { origin: { x: 0, y: 0 }, turn: 0, width: 20, height: 25 } }
    expect(markupPrimitives(text).map((prim) => (prim as TextPrim).text)).toEqual(['một', 'hai'])
  })

  it('drops pen points closer than the threshold but keeps both ends', () => {
    const points = [0, 0.2, 0.4, 2, 2.1, 5].map((x) => ({ x, y: 0 }))
    expect(simplifyStroke(points, 1).map((point) => point.x)).toEqual([0, 2, 5])
  })
})

describe('frame sizes', () => {
  it('fits the widest line of a text block', () => {
    expect(textFrameSize('ab\nabcd', 10, measure)).toEqual({ width: 20, height: (1.3 + 0.9 + 0.3) * 10 })
  })

  it('widens a stamp to its label', () => {
    expect(stampFrameSize('rejected', '30/09/2026', measure).width).toBeGreaterThan(stampFrameSize('draft', '30/09/2026', measure).width)
  })
})
