import { describe, expect, it } from 'vitest'
import type { TextEditMarkup } from '../types/markup.types'
import { PLAIN_FONT } from './font-style'
import { coverFrames, laidOutTextEdit, replacedTextEdit, textEditFromSpans, type TextLook } from './markup-draft'
import { markupBounds, markupHandles, markupPrimitives, orientedPoint, resizeMarkup } from './markup-geometry'
import type { LineSpan } from './text-select'

const measure = (text: string, size: number) => text.length * size * 0.5
const look: TextLook = { font: { serif: true, bold: true, italic: false }, ink: [0.1, 0.2, 0.5], fill: [1, 1, 0.9] }

function span(start: { x: number; y: number }, length: number, text: string, angle = 0): LineSpan {
  return { start, angle, length, top: -8, bottom: 2, text, size: 10, run: 0 }
}

describe('textEditFromSpans', () => {
  it('che trùm chữ gốc có viền, chữ mới đặt đúng chân chữ và đầu dòng cũ', () => {
    const edit = textEditFromSpans('e', [span({ x: 100, y: 200 }, 50, 'Gói thầu')], look, measure) as TextEditMarkup
    // Mép trên lấy cao tới 1 em (dấu chồng), không theo ascent 0,8 của phông.
    expect(edit.cover).toEqual({ width: 52, height: 14 })
    expect(edit.frame.origin).toEqual({ x: 99, y: 189 })
    expect(orientedPoint(edit.frame, edit.inset, edit.baseline)).toEqual({ x: 100, y: 200 })
    expect(edit.lines).toEqual(['Gói thầu'])
    expect(edit.font).toEqual(look.font)
  })

  it('khung đủ rộng để chữ gốc gõ lại bằng phông khác vẫn một dòng', () => {
    const edit = textEditFromSpans('e', [span({ x: 0, y: 50 }, 20, 'Nhà điều hành dự án')], look, measure) as TextEditMarkup
    expect(edit.lines).toHaveLength(1)
    expect(edit.frame.width).toBeGreaterThan(edit.cover.width)
  })

  it('chữ dọc (trang /Rotate): khung xoay theo chữ, chân chữ vẫn trùng', () => {
    const edit = textEditFromSpans('e', [span({ x: 300, y: 400 }, 60, 'ROTATE', 90)], look, measure) as TextEditMarkup
    expect(edit.frame.turn).toBe(90)
    const at = orientedPoint(edit.frame, edit.inset, edit.baseline)
    expect(at.x).toBeCloseTo(300)
    expect(at.y).toBeCloseTo(400)
  })

  it('nhiều dòng gộp thành một khối, chữ nối bằng dấu cách', () => {
    const edit = textEditFromSpans('e', [span({ x: 100, y: 200 }, 50, 'dòng một'), span({ x: 100, y: 214 }, 30, 'dòng hai')], look, measure) as TextEditMarkup
    expect(edit.text).toBe('dòng một dòng hai')
    expect(edit.cover.height).toBeCloseTo(28)
  })
})

describe('textEdit geometry', () => {
  const base = textEditFromSpans('e', [span({ x: 100, y: 200 }, 50, 'Gói thầu XL-03')], look, measure) as TextEditMarkup

  it('kéo tay nắm cuối dòng chỉ đổi bề rộng; ngắt dòng lại thì khung cao lên', () => {
    const [handle] = markupHandles(base)
    expect(handle.id).toBe('end')
    const narrow = resizeMarkup(base, 'end', { x: 150, y: 400 }) as TextEditMarkup
    expect(narrow.frame.width).toBeCloseTo(51)
    expect(narrow.frame.origin).toEqual(base.frame.origin)
    const wrapped = laidOutTextEdit({ ...narrow, text: 'Gói thầu XL-03 bổ sung' }, measure)
    expect(wrapped.lines.length).toBeGreaterThan(1)
    expect(wrapped.frame.height).toBeGreaterThan(base.frame.height)
  })

  it('khung bao gồm cả vùng che khi khung chữ hẹp hơn chữ gốc', () => {
    const narrow = { ...base, frame: { ...base.frame, width: 20 } }
    expect(markupBounds(narrow).width).toBeCloseTo(base.cover.width)
  })

  it('hình vẽ: nền che trước, chữ mới sau, mang kiểu phông gốc', () => {
    const prims = markupPrimitives(base)
    expect(prims[0]).toMatchObject({ type: 'path', fill: look.fill })
    expect(prims.at(-1)).toMatchObject({ type: 'text', text: 'Gói thầu XL-03', bold: true, serif: true, italic: false, color: look.ink })
  })

  it('chỉ che: không có chữ, không có tay nắm', () => {
    const cover = { ...base, text: '', lines: [], font: PLAIN_FONT }
    expect(markupPrimitives(cover)).toHaveLength(1)
    expect(markupHandles(cover)).toEqual([])
  })
})

describe('coverFrames', () => {
  it('mỗi dòng một khung che có viền, theo hướng chữ', () => {
    const [frame] = coverFrames([span({ x: 100, y: 200 }, 50, 'x')])
    expect(frame).toEqual({ origin: { x: 99, y: 189 }, turn: 0, width: 52, height: 14 })
  })
})

describe('replacedTextEdit', () => {
  it('chữ thay dài hơn vẫn một dòng, khung kéo dài sang phải; vùng che giữ nguyên', () => {
    const edit = replacedTextEdit('r', span({ x: 100, y: 200 }, 20, 'XL-03'), look, 'XL-03 bổ sung đợt hai', measure) as TextEditMarkup
    expect(edit.lines).toEqual(['XL-03 bổ sung đợt hai'])
    expect(edit.cover.width).toBeCloseTo(22)
    expect(edit.frame.width).toBeGreaterThan(100)
  })

  it('thay bằng chuỗi rỗng = chỉ che', () => {
    const edit = replacedTextEdit('r', span({ x: 100, y: 200 }, 20, 'XL-03'), look, '', measure) as TextEditMarkup
    expect(edit.lines).toEqual([])
    expect(markupPrimitives(edit)).toHaveLength(1)
  })
})
