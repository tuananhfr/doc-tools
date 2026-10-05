import { describe, expect, it } from 'vitest'
import type { Markup } from '../types/markup.types'
import { drawnMarkup, isTooSmall, laidOutTextBox, placedStamp, placedText, restyledMarkup, retypedText, styleOfMarkup, visualBounds, type MarkupStyle, type PageFrame } from './markup-draft'
import { orientedBounds, orientedPoint } from './markup-geometry'

const style: MarkupStyle = { color: 'red', width: 2, preset: 'approved' }
const upright: PageFrame = { base: { width: 600, height: 800 }, rotation: 0 }
// Trang dọc 600×800 người dùng xoay phải: nhìn thấy khổ 800×600.
const turned: PageFrame = { base: { width: 600, height: 800 }, rotation: 90 }
const measure = (text: string, size: number) => text.length * size * 0.5

describe('drawnMarkup', () => {
  it('stores shapes in the base frame of a turned page', () => {
    const rect = drawnMarkup('rect', 'r', style, [{ x: 100, y: 50 }, { x: 300, y: 150 }], turned)
    // Nhìn thấy x → gốc y ngược (800 − x), nhìn thấy y → gốc x.
    expect(rect).toMatchObject({ box: { x: 50, y: 500, width: 100, height: 200 } })
  })

  it('keeps an underline running along the line the user saw', () => {
    const line = drawnMarkup('underline', 'u', style, [{ x: 100, y: 50 }, { x: 300, y: 70 }], turned)
    if (line.kind !== 'underline') throw new Error('kind')
    expect(line.frame).toMatchObject({ turn: 90, width: 200, height: 20 })
    expect(orientedPoint(line.frame, 200, 0)).toEqual({ x: 50, y: 500 })
  })

  it('drops a click without drag', () => {
    const click = drawnMarkup('rect', 'r', style, [{ x: 10, y: 10 }], upright)
    expect(isTooSmall(click, 2)).toBe(true)
    expect(isTooSmall(drawnMarkup('line', 'l', style, [{ x: 0, y: 0 }, { x: 5, y: 0 }], upright), 2)).toBe(false)
  })
})

describe('placing', () => {
  it('centres a stamp on the click point', () => {
    const stamp = placedStamp('s', 'approved', '30/09/2026', { x: 300, y: 400 }, upright, measure)
    if (stamp.kind !== 'stamp') throw new Error('kind')
    const box = orientedBounds(stamp.frame)
    expect(box.x + box.width / 2).toBeCloseTo(300)
    expect(box.y + box.height / 2).toBeCloseTo(400)
  })

  it('sizes text from the chosen stroke width and grows it when retyped', () => {
    const text = placedText('text', 't', 'ab', { x: 10, y: 10 }, { ...style, width: 4 }, upright, measure)
    expect(text).toMatchObject({ fontSize: 20, frame: { width: 20 } })
    expect(retypedText(text, 'abcd', measure)).toMatchObject({ text: 'abcd', frame: { width: 40, origin: { x: 10, y: 10 } } })
  })

  it('puts the edit box where the user sees a text on a turned page', () => {
    const text = placedText('note', 'n', 'ab', { x: 100, y: 50 }, style, turned, measure)
    expect(visualBounds(text, turned)).toMatchObject({ x: 100, y: 50 })
  })
})

describe('restyledMarkup', () => {
  it('scales a text frame with its font size', () => {
    const text: Markup = { id: 't', kind: 'text', color: 'red', fontSize: 10, text: 'a', frame: { origin: { x: 0, y: 0 }, turn: 0, width: 5, height: 25 } }
    const bigger = restyledMarkup(text, { width: 4 }, measure)
    expect(bigger).toMatchObject({ fontSize: 20, frame: { width: 10, height: 50 } })
    expect(styleOfMarkup(bigger)).toEqual({ color: 'red', width: 4 })
  })

  it('never recolours a stamp and ignores width on a highlight', () => {
    const stamp = placedStamp('s', 'draft', '', { x: 0, y: 0 }, upright, measure)
    expect(restyledMarkup(stamp, { color: 'blue' }, measure)).toBe(stamp)
    const highlight: Markup = { id: 'h', kind: 'highlight', color: 'yellow', box: { x: 0, y: 0, width: 10, height: 10 } }
    expect(restyledMarkup(highlight, { width: 4 }, measure)).toBe(highlight)
  })
})

describe('widened text boxes', () => {
  // Cỡ 10 → mỗi ký tự 5pt; khung 45pt chứa được "một hai" (35pt) nhưng không chứa nổi "một hai ba" (50pt).
  const box: Markup = { id: 't', kind: 'text', color: 'red', fontSize: 10, text: 'một hai ba bốn', wrap: 45, frame: { origin: { x: 0, y: 0 }, turn: 0, width: 45, height: 12 } }

  it('rewraps and grows the frame to fit the lines', () => {
    const laid = laidOutTextBox(box, measure)
    expect(laid.lines).toEqual(['một hai', 'ba bốn'])
    expect(laid.frame).toMatchObject({ width: 45, height: (1.3 + 0.9 + 0.3) * 10 })
  })

  it('keeps the dragged width when the text is retyped', () => {
    const retyped = retypedText(laidOutTextBox(box, measure), 'một', measure)
    expect(retyped).toMatchObject({ wrap: 45, lines: ['một'], frame: { width: 45 } })
  })

  it('scales the wrap width with the font so line breaks stay put', () => {
    const laid = laidOutTextBox(box, measure)
    const bigger = restyledMarkup(laid, { width: 4 }, measure)
    expect(bigger).toMatchObject({ fontSize: 20, wrap: 45 * (20 / 10), lines: laid.lines })
  })

  it('leaves an untouched text box hugging its text', () => {
    const plain: Markup = { id: 'p', kind: 'note', color: 'red', text: 'a', frame: { origin: { x: 0, y: 0 }, turn: 0, width: 10, height: 10 } }
    expect(laidOutTextBox(plain, measure)).toBe(plain)
  })
})
