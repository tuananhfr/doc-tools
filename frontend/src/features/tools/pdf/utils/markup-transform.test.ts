import { describe, expect, it } from 'vitest'
import type { Markup, TextEditMarkup } from '../types/markup.types'
import { fitTransform, remapMarkups, transformMarkup } from './markup-transform'

const DOUBLE = { scale: 2, dx: 10, dy: 20 }

describe('fitTransform', () => {
  it('maps one placement of an image onto another', () => {
    const t = fitTransform({ x: 0, y: 100, width: 400, height: 300 }, { x: 50, y: 50, width: 200, height: 150 })
    expect(t.scale).toBeCloseTo(0.5)
    expect(0 * t.scale + t.dx).toBeCloseTo(50)
    expect(100 * t.scale + t.dy).toBeCloseTo(50)
    expect(400 * t.scale + t.dx).toBeCloseTo(250)
  })
})

describe('transformMarkup', () => {
  it('scales geometry but keeps stroke width', () => {
    const rect: Markup = { id: 'r', kind: 'rect', color: 'red', width: 2, box: { x: 1, y: 2, width: 3, height: 4 } }
    expect(transformMarkup(rect, DOUBLE)).toEqual({ ...rect, box: { x: 12, y: 24, width: 6, height: 8 } })

    const pen: Markup = { id: 'p', kind: 'pen', color: 'red', width: 1, points: [{ x: 0, y: 0 }, { x: 5, y: 5 }] }
    expect(transformMarkup(pen, DOUBLE)).toMatchObject({ width: 1, points: [{ x: 10, y: 20 }, { x: 20, y: 30 }] })
  })

  it('scales text size with its frame, but not a note', () => {
    const frame = { origin: { x: 5, y: 5 }, turn: 90 as const, width: 40, height: 12 }
    const text: Markup = { id: 't', kind: 'text', color: 'blue', fontSize: 10, text: 'A', frame }
    expect(transformMarkup(text, DOUBLE)).toMatchObject({ fontSize: 20, frame: { origin: { x: 20, y: 30 }, turn: 90, width: 80, height: 24 } })

    const note: Markup = { id: 'n', kind: 'note', color: 'yellow', text: 'B', frame }
    expect(transformMarkup(note, DOUBLE)).toMatchObject({ frame: { origin: { x: 20, y: 30 }, width: 40, height: 12 } })
  })

  it('scales every dimension of a text edit', () => {
    const edit: TextEditMarkup = {
      id: 'e',
      kind: 'textEdit',
      frame: { origin: { x: 0, y: 0 }, turn: 0, width: 100, height: 14 },
      cover: { width: 90, height: 14 },
      text: 'x',
      lines: ['x'],
      fontSize: 10,
      baseline: 11,
      inset: 1,
      font: { serif: false, bold: false, italic: false },
      ink: [0, 0, 0],
      fill: [1, 1, 1],
    }
    expect(transformMarkup(edit, DOUBLE)).toMatchObject({ cover: { width: 180, height: 28 }, fontSize: 20, baseline: 22, inset: 2, lines: ['x'] })
  })
})

describe('remapMarkups', () => {
  it('moves each mark with the image it sits on', () => {
    const from = [
      { x: 0, y: 0, width: 100, height: 100 },
      { x: 0, y: 200, width: 100, height: 100 },
    ]
    const to = [
      { x: 10, y: 10, width: 50, height: 50 },
      { x: 10, y: 100, width: 50, height: 50 },
    ]
    const onSecond: Markup = { id: 'a', kind: 'line', color: 'red', width: 1, from: { x: 0, y: 200 }, to: { x: 100, y: 300 } }
    const [moved] = remapMarkups([onSecond], from, to)!
    expect(moved).toMatchObject({ from: { x: 10, y: 100 }, to: { x: 60, y: 150 } })
  })

  it('leaves marks alone when there is nothing to map', () => {
    expect(remapMarkups(undefined, [], [])).toBeUndefined()
  })
})
