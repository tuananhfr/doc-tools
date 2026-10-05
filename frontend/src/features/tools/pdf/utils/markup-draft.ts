import type { Markup, MarkupColor, MarkupTool, OrientedBox, Rect, StampPreset, StrokeWidth, TextEditMarkup } from '../types/markup.types'
import type { Rgb } from './decorations'
import { PLAIN_FONT, type FontStyle } from './font-style'
import {
  EDIT_DESCENT,
  EDIT_LINE_HEIGHT,
  markupBounds,
  NOTE_FONT_SIZE,
  NOTE_PADDING,
  orientedBounds,
  noteFrameSize,
  rectFromPoints,
  stampFrameSize,
  TEXT_SIZE,
  textBoxLayout,
  textFrameSize,
  type MeasureText,
} from './markup-geometry'
import { baseToVisual, turnAxes, visualToBase, type Point, type QuarterTurn, type Size } from './page-geometry'
import { reflowLines, type ReflowBlock } from './reflow-layout'
import type { LineSpan } from './text-select'
import { wrapText } from './text-wrap'

/**
 * Dựng / sửa dấu từ thao tác trên màn hình. Điểm vào là toạ độ NHÌN THẤY (pt,
 * đã áp xoay thêm); dấu ra lưu ở khung gốc — xem `markup.types.ts`.
 */

export interface MarkupStyle {
  color: MarkupColor
  width: StrokeWidth
  preset: StampPreset
}

/** Trang đang sửa: khổ khung gốc + xoay thêm hiện tại. */
export interface PageFrame {
  base: Size
  rotation: QuarterTurn
}

export const DRAW_TOOLS = ['pen', 'line', 'arrow', 'rect', 'ellipse', 'cloud', 'highlight', 'underline', 'strikeout', 'redact'] as const

export type DrawTool = (typeof DRAW_TOOLS)[number]

export function isDrawTool(tool: MarkupTool): tool is DrawTool {
  return (DRAW_TOOLS as readonly string[]).includes(tool)
}

/** Khung có hướng từ một khung nhìn thấy: chữ chạy theo chiều người dùng đang nhìn. */
function visualFrame(rect: Rect, page: PageFrame): OrientedBox {
  return { origin: visualToBase({ x: rect.x, y: rect.y }, page.base, page.rotation), turn: page.rotation, width: rect.width, height: rect.height }
}

/** Dấu đang kéo dở: `trail` là các điểm nhìn thấy từ lúc nhấn tới hiện tại (ít nhất 1). */
export function drawnMarkup(tool: DrawTool, id: string, style: MarkupStyle, trail: Point[], page: PageFrame): Markup {
  const toBase = (point: Point) => visualToBase(point, page.base, page.rotation)
  const start = trail[0]
  const end = trail[trail.length - 1]
  const { color, width } = style

  switch (tool) {
    case 'pen':
      return { id, kind: 'pen', color, width, points: trail.map(toBase) }
    case 'line':
    case 'arrow':
      return { id, kind: tool, color, width, from: toBase(start), to: toBase(end) }
    case 'rect':
    case 'ellipse':
    case 'cloud':
      return { id, kind: tool, color, width, box: rectFromPoints(toBase(start), toBase(end)) }
    case 'highlight':
      return { id, kind: 'highlight', color, box: rectFromPoints(toBase(start), toBase(end)) }
    case 'redact':
      return { id, kind: 'redact', box: rectFromPoints(toBase(start), toBase(end)) }
    case 'underline':
    case 'strikeout':
      return { id, kind: tool, color, width, frame: visualFrame(rectFromPoints(start, end), page) }
  }
}

export const TEXT_MARKUP_TOOLS = ['highlight', 'underline', 'strikeout', 'redact'] as const

export type TextMarkupTool = (typeof TEXT_MARKUP_TOOLS)[number]

export function isTextMarkupTool(tool: MarkupTool): tool is TextMarkupTool {
  return (TEXT_MARKUP_TOOLS as readonly string[]).includes(tool)
}

/** Mỗi dòng chữ đã chọn thành một dấu — `id` gốc + số dòng để giữ khoá ổn định khi đang kéo. */
export function snappedMarkups(tool: TextMarkupTool, id: string, style: MarkupStyle, lines: LineSpan[]): Markup[] {
  return lines.map((line, index) => {
    const turn = line.angle as QuarterTurn
    const axes = turnAxes(turn)
    const origin = { x: line.start.x + axes.y.x * line.top, y: line.start.y + axes.y.y * line.top }
    const frame: OrientedBox = { origin, turn, width: line.length, height: line.bottom - line.top }
    const lineId = `${id}-${index}`
    if (tool === 'redact') return { id: lineId, kind: 'redact', box: orientedBounds(frame) }
    return tool === 'highlight'
      ? { id: lineId, kind: 'highlight', color: style.color, box: orientedBounds(frame) }
      : { id: lineId, kind: tool, color: style.color, width: style.width, frame }
  })
}

/** Nhấn nhầm / kéo quá ngắn thì không tạo dấu — `min` tính bằng pt. */
export function isTooSmall(markup: Markup, min: number): boolean {
  switch (markup.kind) {
    case 'line':
    case 'arrow':
      return Math.hypot(markup.to.x - markup.from.x, markup.to.y - markup.from.y) < min
    case 'pen': {
      const box = markupBounds(markup)
      return Math.max(box.width, box.height) - markup.width < min
    }
    case 'underline':
    case 'strikeout':
      return markup.frame.width < min
    case 'rect':
    case 'ellipse':
    case 'cloud':
    case 'highlight':
    case 'redact':
      return markup.box.width < min || markup.box.height < min
    case 'textEdit':
      return markup.cover.width < min || markup.cover.height < min
    default:
      return false
  }
}

export function placedStamp(id: string, preset: StampPreset, date: string, center: Point, page: PageFrame, measure: MeasureText): Markup {
  const { width, height } = stampFrameSize(preset, date, measure)
  const rect = { x: center.x - width / 2, y: center.y - height / 2, width, height }
  return { id, kind: 'stamp', preset, date, frame: visualFrame(rect, page) }
}

export type TextKind = 'text' | 'note'

export function textFontSize(kind: TextKind, width: StrokeWidth): number {
  return kind === 'note' ? NOTE_FONT_SIZE : TEXT_SIZE[width]
}

function fittedSize(kind: TextKind, text: string, fontSize: number, measure: MeasureText): Size {
  return kind === 'note' ? noteFrameSize(text, measure) : textFrameSize(text, fontSize, measure)
}

/** Chữ / ghi chú mới đặt góc trên-trái tại `at` (nhìn thấy). */
export function placedText(kind: TextKind, id: string, text: string, at: Point, style: MarkupStyle, page: PageFrame, measure: MeasureText): Markup {
  const fontSize = textFontSize(kind, style.width)
  const size = fittedSize(kind, text, fontSize, measure)
  const frame = visualFrame({ x: at.x, y: at.y, ...size }, page)
  return kind === 'note' ? { id, kind, color: style.color, text, frame } : { id, kind, color: style.color, fontSize, text, frame }
}

/** Sửa chữ của dấu có sẵn: giữ góc, hướng và bề rộng đã kéo; khung co giãn theo chữ mới. */
export function retypedText(markup: Markup, text: string, measure: MeasureText): Markup {
  if (markup.kind !== 'text' && markup.kind !== 'note') return markup
  if (markup.wrap !== undefined) return laidOutTextBox({ ...markup, text }, measure)
  const fontSize = markup.kind === 'note' ? NOTE_FONT_SIZE : markup.fontSize
  const size = fittedSize(markup.kind, text, fontSize, measure)
  return { ...markup, text, frame: { ...markup.frame, ...size } }
}

type TextBoxMarkup = Extract<Markup, { kind: 'text' | 'note' }>

/** Ngắt lại dòng theo `wrap` và cho khung cao vừa số dòng — gọi sau mỗi lần kéo bề rộng. */
export function laidOutTextBox<T extends TextBoxMarkup>(markup: T, measure: MeasureText): T {
  if (markup.wrap === undefined) return markup
  const note = markup.kind === 'note'
  const fontSize = markup.kind === 'note' ? NOTE_FONT_SIZE : markup.fontSize
  const layout = textBoxLayout(markup.text, fontSize, measure, note ? NOTE_PADDING : 0, markup.wrap)
  return { ...markup, lines: layout.lines, frame: { ...markup.frame, width: layout.width, height: layout.height } }
}

/** Đổi màu / nét / mẫu dấu của dấu đang chọn — thuộc tính nào không áp cho loại đó thì bỏ qua. */
export function restyledMarkup(markup: Markup, patch: Partial<MarkupStyle>, measure: MeasureText | null): Markup {
  let next = markup
  if (next.kind === 'textEdit' || next.kind === 'redact') return next
  if (patch.color && next.kind !== 'stamp') next = { ...next, color: patch.color }
  if (patch.width) {
    if (next.kind === 'text') {
      const fontSize = TEXT_SIZE[patch.width]
      const k = fontSize / next.fontSize
      // Phóng cả bề rộng ngắt dòng cùng tỉ lệ: các dòng giữ nguyên chỗ xuống dòng.
      const wrap = next.wrap === undefined ? undefined : next.wrap * k
      next = { ...next, fontSize, wrap, frame: { ...next.frame, width: next.frame.width * k, height: next.frame.height * k } }
    } else if ('width' in next) {
      next = { ...next, width: patch.width }
    }
  }
  if (patch.preset && next.kind === 'stamp' && measure) {
    const { width } = stampFrameSize(patch.preset, next.date, measure, next.frame.height)
    next = { ...next, preset: patch.preset, frame: { ...next.frame, width } }
  }
  return next
}

/** Kiểu đang áp cho một dấu — để thanh công cụ hiện đúng lựa chọn khi đang chọn dấu đó. */
export function styleOfMarkup(markup: Markup): Partial<MarkupStyle> {
  switch (markup.kind) {
    case 'stamp':
      return { preset: markup.preset }
    case 'textEdit':
    case 'redact':
      return {}
    case 'text': {
      const width = (Object.keys(TEXT_SIZE).map(Number) as StrokeWidth[]).find((key) => TEXT_SIZE[key] === markup.fontSize)
      return { color: markup.color, width }
    }
    case 'note':
    case 'highlight':
      return { color: markup.color }
    default:
      return { color: markup.color, width: markup.width }
  }
}

/** Màu + phông của chữ gốc, lấy mẫu từ trang đã vẽ. */
export interface TextLook {
  font: FontStyle
  /** Tên phông của chữ gốc trong PDF — để tìm đúng phông ấy trên máy người dùng. */
  sourceFont?: string
  ink: Rgb
  fill: Rgb
}

const COVER_INK: Rgb = [0, 0, 0]

/** Viền che thêm quanh chữ gốc: mép chữ khử răng cưa lộ ra ngoài khung đo nếu che khít. */
function coverPad(size: number) {
  return Math.max(0.75, size * 0.1)
}

/**
 * Mép trên vùng che (âm, tính từ chân chữ). Dấu chồng tiếng Việt (ầ, ổ, ễ) cao
 * hơn "ascent" phông khai trong PDF — che theo ascent là sót lại mấy chấm dấu.
 */
function coverTop(span: LineSpan) {
  return Math.min(span.top, -span.size)
}

// Bề rộng đo bằng canvas và ô gõ làm tròn điểm ảnh khác nhau — thiếu nửa điểm là chữ gốc bị đẩy xuống dòng.
export const WRAP_SLACK = 0.02

/** Ngắt dòng lại theo bề rộng khung + chữ hiện tại, khung cao theo số dòng nhưng không thấp hơn vùng che. */
export function laidOutTextEdit(markup: TextEditMarkup, measure: MeasureText): TextEditMarkup {
  const { fontSize, font, inset } = markup
  const lines = markup.text ? wrapText(markup.text, markup.frame.width - inset * 2, (line) => measure(line, fontSize, font.bold, font)) : []
  const textHeight = lines.length > 0 ? markup.baseline + ((lines.length - 1) * EDIT_LINE_HEIGHT + EDIT_DESCENT) * fontSize + inset : 0
  return { ...markup, lines, frame: { ...markup.frame, height: Math.max(markup.cover.height, textHeight) } }
}

/**
 * Như `laidOutTextEdit` nhưng cho chữ sẽ VIẾT LẠI vào trang: ngắt ở mép cột của
 * khối, dòng cách dòng đúng như chữ gốc — ô gõ hiện chữ ở đúng chỗ nó sẽ nằm.
 */
export function laidOutReflow(markup: TextEditMarkup, block: ReflowBlock, measure: MeasureText): TextEditMarkup {
  const { fontSize, font, inset } = markup
  const lines = reflowLines(markup.text, block, (line) => measure(line, fontSize, font.bold, font))
  const textHeight = markup.baseline + (Math.max(1, lines.length) - 1) * block.pitch + EDIT_DESCENT * fontSize + inset
  const width = block.right - Math.min(0, block.left) + inset * 2
  return { ...markup, lines, frame: { ...markup.frame, width, height: Math.max(markup.cover.height, textHeight) } }
}

/**
 * Vùng chữ gốc (một hay nhiều dòng liền nhau, cùng hướng) → dấu sửa chữ đang
 * mang chữ gốc. Khung ban đầu đủ rộng để chữ gốc gõ lại bằng phông thay thế
 * vẫn nằm một dòng — phông khác bề rộng, ngắt dòng khác đi là chữ "nhảy" ngay
 * khi vừa bấm vào dù chưa sửa gì.
 */
export function textEditFromSpans(id: string, spans: LineSpan[], look: TextLook, measure: MeasureText): TextEditMarkup | null {
  const first = spans[0]
  if (!first) return null
  const same = spans.filter((span) => span.angle === first.angle)
  const turn = first.angle as QuarterTurn
  const axes = turnAxes(turn)
  const u = (p: Point) => (p.x - first.start.x) * axes.x.x + (p.y - first.start.y) * axes.x.y
  const v = (p: Point) => (p.x - first.start.x) * axes.y.x + (p.y - first.start.y) * axes.y.y
  const left = Math.min(...same.map((span) => u(span.start)))
  const right = Math.max(...same.map((span) => u(span.start) + span.length))
  const top = Math.min(...same.map((span) => v(span.start) + coverTop(span)))
  const bottom = Math.max(...same.map((span) => v(span.start) + span.bottom))
  const pad = coverPad(first.size)
  const origin = {
    x: first.start.x + axes.x.x * (left - pad) + axes.y.x * (top - pad),
    y: first.start.y + axes.x.y * (left - pad) + axes.y.y * (top - pad),
  }
  const text = same.map((span) => span.text).join(' ')
  const cover = { width: right - left + pad * 2, height: bottom - top + pad * 2 }
  const oneLine = measure(text, first.size, look.font.bold, look.font) * (1 + WRAP_SLACK) + pad * 2
  return laidOutTextEdit(
    {
      id,
      kind: 'textEdit',
      frame: { origin, turn, width: Math.max(cover.width, oneLine), height: cover.height },
      cover,
      text,
      lines: [],
      fontSize: first.size,
      baseline: pad - top,
      inset: pad,
      font: look.font,
      ink: look.ink,
      fill: look.fill,
    },
    measure,
  )
}

/**
 * Thay một đoạn chữ trên MỘT dòng bằng chữ khác (tìm & thay): không ngắt dòng
 * — chữ dài hơn kéo dài sang phải, cảnh báo tràn đã báo trước khi thay.
 */
export function replacedTextEdit(id: string, span: LineSpan, look: TextLook, replacement: string, measure: MeasureText): TextEditMarkup | null {
  const base = textEditFromSpans(id, [span], look, measure)
  if (!base) return null
  const wide = measure(replacement, base.fontSize, base.font.bold, base.font) * (1 + WRAP_SLACK) + base.inset * 2
  return laidOutTextEdit({ ...base, text: replacement, frame: { ...base.frame, width: Math.max(base.cover.width, wide) } }, measure)
}

/** Chỉ che (không viết chữ mới) một khung có hướng. */
export function coverMarkup(id: string, frame: OrientedBox, fill: Rgb): TextEditMarkup {
  return {
    id,
    kind: 'textEdit',
    frame,
    cover: { width: frame.width, height: frame.height },
    text: '',
    lines: [],
    fontSize: 12,
    baseline: 0,
    inset: 0,
    font: PLAIN_FONT,
    ink: COVER_INK,
    fill,
  }
}

/** Che từng dòng chữ đã chọn — thêm viền như sửa chữ để mép chữ khỏi lộ. */
export function coverFrames(spans: LineSpan[]): OrientedBox[] {
  return spans.map((span) => {
    const turn = span.angle as QuarterTurn
    const axes = turnAxes(turn)
    const pad = coverPad(span.size)
    const lift = coverTop(span) - pad
    return {
      origin: { x: span.start.x - axes.x.x * pad + axes.y.x * lift, y: span.start.y - axes.x.y * pad + axes.y.y * lift },
      turn,
      width: span.length + pad * 2,
      height: span.bottom - coverTop(span) + pad * 2,
    }
  })
}

/** Khung che kéo tay (ngoài chữ) theo hướng người dùng đang nhìn. */
export function coverFrameFromTrail(trail: Point[], page: PageFrame): OrientedBox {
  return visualFrame(rectFromPoints(trail[0], trail[trail.length - 1]), page)
}

/** Khung bao của dấu trên trang nhìn thấy — chỗ đặt ô gõ chữ khi sửa. */
export function visualBounds(markup: Markup, page: PageFrame): Rect {
  const box = markupBounds(markup)
  const a = baseToVisual({ x: box.x, y: box.y }, page.base, page.rotation)
  const b = baseToVisual({ x: box.x + box.width, y: box.y + box.height }, page.base, page.rotation)
  return rectFromPoints(a, b)
}
