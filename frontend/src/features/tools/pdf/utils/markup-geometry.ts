import { translate } from '@/i18n/runtime'
import type { Markup, MarkupColor, OrientedBox, Rect, StampPreset, StrokeWidth, TextEditMarkup } from '../types/markup.types'
import { DOCUMENT_COLORS, type Rgb } from './decorations'
import type { FontStyle } from './font-style'
import { turnAxes, type Point, type QuarterTurn, type TextAlign } from './page-geometry'
import { wrapText } from './text-wrap'

/** Màu IN RA tệp (như `DOCUMENT_COLORS`) — không theo theme giao diện. */
export const MARKUP_COLORS: Record<MarkupColor, Rgb> = {
  red: [0.86, 0.15, 0.15],
  orange: [0.93, 0.47, 0.07],
  yellow: [0.98, 0.8, 0.08],
  green: [0.09, 0.6, 0.3],
  blue: [0.12, 0.4, 0.85],
  black: [0.1, 0.1, 0.12],
}

export const STAMP_PRESETS: Record<StampPreset, { color: Rgb }> = {
  approved: { color: [0.09, 0.55, 0.27] },
  rejected: { color: [0.8, 0.12, 0.14] },
  checked: { color: [0.12, 0.35, 0.75] },
  revise: { color: [0.85, 0.42, 0.05] },
  draft: { color: DOCUMENT_COLORS.gray },
}

/** Chữ trên con dấu theo ngôn ngữ trang — vừa hiện ở thanh công cụ vừa in vào PDF. */
export const stampLabel = (preset: StampPreset) => translate(`pdf:file.stamps.${preset}`)

/** Cỡ chữ của công cụ Chữ theo độ dày nét đang chọn — một thanh chọn cho cả hai. */
export const TEXT_SIZE: Record<StrokeWidth, number> = { 1: 10, 2: 14, 4: 20 }

export const NOTE_FONT_SIZE = 10
export const STAMP_HEIGHT = 40
/** Tô sáng vẽ kiểu multiply: chữ đen bên dưới vẫn đen, không bị phủ mờ. */
export const HIGHLIGHT_OPACITY = 0.35
export const REDACT_FILL: Rgb = [0, 0, 0]

const LINE_HEIGHT = 1.3
const ASCENT = 0.9
const DESCENT = 0.3
export const NOTE_PADDING = 6

export type PathSeg = { op: 'M' | 'L'; p: Point } | { op: 'C'; c1: Point; c2: Point; p: Point } | { op: 'Z' }

export interface PathPrim {
  type: 'path'
  segs: PathSeg[]
  stroke?: Rgb
  width?: number
  fill?: Rgb
  fillOpacity?: number
  multiply?: boolean
}

export interface TextPrim {
  type: 'text'
  text: string
  /** Điểm neo trên đường chân chữ, khung gốc. */
  at: Point
  align: TextAlign
  /** Độ, ngược chiều kim đồng hồ, trong khung gốc. */
  angle: number
  size: number
  bold: boolean
  /** Chỉ chữ sửa lại mới có — mặc định phông không chân, đứng. */
  italic?: boolean
  serif?: boolean
  match?: boolean
  local?: string
  color: Rgb
}

/**
 * Mọi dấu quy về các nét path + dòng chữ ở khung gốc. Lớp SVG trên màn hình
 * và `pdf-markup` lúc xuất vẽ CÙNG danh sách này — hai bên tự tính hình là
 * màn hình một kiểu, tệp ra một kiểu.
 */
export type Prim = PathPrim | TextPrim

/** `font` (nếu có) thay cho `bold` — dùng cho chữ sửa lại theo kiểu phông gốc. */
export type MeasureText = (text: string, size: number, bold: boolean, font?: FontStyle) => number

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k })

export function rectFromPoints(a: Point, b: Point): Rect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }
}

/** Điểm (lx, ly) trong khung có hướng → khung gốc. */
export function orientedPoint(frame: OrientedBox, lx: number, ly: number): Point {
  const axes = turnAxes(frame.turn)
  return add(frame.origin, add(scale(axes.x, lx), scale(axes.y, ly)))
}

export function orientedBounds(frame: OrientedBox): Rect {
  const corners = [
    orientedPoint(frame, 0, 0),
    orientedPoint(frame, frame.width, 0),
    orientedPoint(frame, frame.width, frame.height),
    orientedPoint(frame, 0, frame.height),
  ]
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}

/** Ngược của `orientedBounds`: khung gốc + hướng → khung có hướng (góc gốc tuỳ `turn`). */
export function orientedFromBounds(box: Rect, turn: QuarterTurn): OrientedBox {
  const sideways = turn === 90 || turn === 270
  const width = sideways ? box.height : box.width
  const height = sideways ? box.width : box.height
  const origin =
    turn === 0
      ? { x: box.x, y: box.y }
      : turn === 90
        ? { x: box.x, y: box.y + box.height }
        : turn === 180
          ? { x: box.x + box.width, y: box.y + box.height }
          : { x: box.x + box.width, y: box.y }
  return { origin, turn, width, height }
}

function rectSegs({ x, y, width, height }: Rect): PathSeg[] {
  return [
    { op: 'M', p: { x, y } },
    { op: 'L', p: { x: x + width, y } },
    { op: 'L', p: { x: x + width, y: y + height } },
    { op: 'L', p: { x, y: y + height } },
    { op: 'Z' },
  ]
}

function orientedRectSegs(frame: OrientedBox, inset = 0): PathSeg[] {
  const at = (lx: number, ly: number) => orientedPoint(frame, lx, ly)
  const right = frame.width - inset
  const bottom = frame.height - inset
  return [
    { op: 'M', p: at(inset, inset) },
    { op: 'L', p: at(right, inset) },
    { op: 'L', p: at(right, bottom) },
    { op: 'L', p: at(inset, bottom) },
    { op: 'Z' },
  ]
}

/** Ellipse = 4 cung Bézier bậc ba (sai số < 0,03%) — PDF không có lệnh vẽ ellipse. */
function ellipseSegs({ x, y, width, height }: Rect): PathSeg[] {
  const k = 0.5523
  const rx = width / 2
  const ry = height / 2
  const cx = x + rx
  const cy = y + ry
  return [
    { op: 'M', p: { x: cx + rx, y: cy } },
    { op: 'C', c1: { x: cx + rx, y: cy + k * ry }, c2: { x: cx + k * rx, y: cy + ry }, p: { x: cx, y: cy + ry } },
    { op: 'C', c1: { x: cx - k * rx, y: cy + ry }, c2: { x: cx - rx, y: cy + k * ry }, p: { x: cx - rx, y: cy } },
    { op: 'C', c1: { x: cx - rx, y: cy - k * ry }, c2: { x: cx - k * rx, y: cy - ry }, p: { x: cx, y: cy - ry } },
    { op: 'C', c1: { x: cx + k * rx, y: cy - ry }, c2: { x: cx + rx, y: cy - k * ry }, p: { x: cx + rx, y: cy } },
    { op: 'Z' },
  ]
}

/** Đám mây (đánh dấu vùng sửa trên bản vẽ): mép chữ nhật thay bằng chuỗi vòng cung phồng ra ngoài. */
export function cloudSegs(box: Rect): PathSeg[] {
  const bump = Math.min(16, Math.max(6, Math.min(box.width, box.height) / 4))
  const { x, y, width, height } = box
  const corners: Point[] = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ]
  const outward: Point[] = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ]
  const segs: PathSeg[] = [{ op: 'M', p: corners[0] }]
  corners.forEach((start, side) => {
    const end = corners[(side + 1) % 4]
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const count = Math.max(1, Math.round(length / bump))
    const step = scale({ x: end.x - start.x, y: end.y - start.y }, 1 / count)
    const lift = scale(outward[side], (length / count) * 0.6)
    for (let index = 0; index < count; index++) {
      const from = add(start, scale(step, index))
      const to = add(start, scale(step, index + 1))
      segs.push({ op: 'C', c1: add(add(from, scale(step, 0.1)), lift), c2: add(add(to, scale(step, -0.1)), lift), p: to })
    }
  })
  segs.push({ op: 'Z' })
  return segs
}

function polylineSegs(points: Point[]): PathSeg[] {
  return points.map((p, index) => ({ op: index === 0 ? 'M' : 'L', p }))
}

function arrowHeadSegs(from: Point, to: Point, width: number): PathSeg[] {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1
  const dir = { x: (to.x - from.x) / length, y: (to.y - from.y) / length }
  const head = Math.max(8, width * 4)
  const wing = (angle: number): Point => {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return { x: to.x - head * (dir.x * cos - dir.y * sin), y: to.y - head * (dir.x * sin + dir.y * cos) }
  }
  const spread = (25 * Math.PI) / 180
  return [
    { op: 'M', p: wing(spread) },
    { op: 'L', p: to },
    { op: 'L', p: wing(-spread) },
  ]
}

function textLines(frame: OrientedBox, lines: string[], size: number, left: number, top: number, color: Rgb, bold = false): TextPrim[] {
  return lines.map((line, index) => ({
    type: 'text',
    text: line,
    at: orientedPoint(frame, left, top + ASCENT * size + index * LINE_HEIGHT * size),
    align: 'start',
    angle: frame.turn,
    size,
    bold,
    color,
  }))
}

/** Khoảng cách hai dòng chữ sửa lại, theo cỡ chữ — sát kiểu văn bản in hơn LINE_HEIGHT của ghi chú. */
export const EDIT_LINE_HEIGHT = 1.2
export const EDIT_DESCENT = 0.25

function textEditPrimitives(markup: TextEditMarkup): Prim[] {
  const { frame, cover, fill } = markup
  const prims: Prim[] = [{ type: 'path', segs: orientedRectSegs({ ...frame, ...cover }), fill }]
  if (markup.lines.length === 0) return prims
  prims.push({ type: 'path', segs: orientedRectSegs(frame), fill })
  markup.lines.forEach((line, index) => {
    prims.push({
      type: 'text',
      text: line,
      at: orientedPoint(frame, markup.inset, markup.baseline + index * EDIT_LINE_HEIGHT * markup.fontSize),
      align: 'start',
      angle: frame.turn,
      size: markup.fontSize,
      bold: markup.font.bold,
      italic: markup.font.italic,
      serif: markup.font.serif,
      match: markup.font.match,
      local: markup.font.local,
      color: markup.ink,
    })
  })
  return prims
}

/** Pha màu với trắng — nền ghi chú nhạt để chữ đen đọc được. */
function tint([r, g, b]: Rgb, amount: number): Rgb {
  return [r + (1 - r) * amount, g + (1 - g) * amount, b + (1 - b) * amount]
}

export function markupPrimitives(markup: Markup): Prim[] {
  switch (markup.kind) {
    case 'pen':
      return [{ type: 'path', segs: polylineSegs(markup.points), stroke: MARKUP_COLORS[markup.color], width: markup.width }]
    case 'line':
    case 'arrow': {
      const stroke = MARKUP_COLORS[markup.color]
      const segs = polylineSegs([markup.from, markup.to])
      if (markup.kind === 'arrow') segs.push(...arrowHeadSegs(markup.from, markup.to, markup.width))
      return [{ type: 'path', segs, stroke, width: markup.width }]
    }
    case 'rect':
    case 'ellipse':
    case 'cloud': {
      const segs = markup.kind === 'rect' ? rectSegs(markup.box) : markup.kind === 'ellipse' ? ellipseSegs(markup.box) : cloudSegs(markup.box)
      return [{ type: 'path', segs, stroke: MARKUP_COLORS[markup.color], width: markup.width }]
    }
    case 'highlight':
      return [{ type: 'path', segs: rectSegs(markup.box), fill: MARKUP_COLORS[markup.color], fillOpacity: HIGHLIGHT_OPACITY, multiply: true }]
    case 'redact':
      return [{ type: 'path', segs: rectSegs(markup.box), fill: REDACT_FILL }]
    case 'underline':
    case 'strikeout': {
      const { frame } = markup
      const y = markup.kind === 'underline' ? frame.height - markup.width / 2 : frame.height / 2
      return [
        {
          type: 'path',
          segs: polylineSegs([orientedPoint(frame, 0, y), orientedPoint(frame, frame.width, y)]),
          stroke: MARKUP_COLORS[markup.color],
          width: markup.width,
        },
      ]
    }
    case 'text':
      return textLines(markup.frame, markup.lines ?? markup.text.split('\n'), markup.fontSize, 0, 0, MARKUP_COLORS[markup.color])
    case 'note': {
      const color = MARKUP_COLORS[markup.color]
      return [
        { type: 'path', segs: orientedRectSegs(markup.frame), fill: tint(color, 0.8), stroke: color, width: 1 },
        ...textLines(markup.frame, markup.lines ?? markup.text.split('\n'), NOTE_FONT_SIZE, NOTE_PADDING, NOTE_PADDING, DOCUMENT_COLORS.text),
      ]
    }
    case 'textEdit':
      return textEditPrimitives(markup)
    case 'stamp': {
      const { frame } = markup
      const { color } = STAMP_PRESETS[markup.preset]
      const label = stampLabel(markup.preset)
      const h = frame.height
      const center = frame.width / 2
      return [
        { type: 'path', segs: orientedRectSegs(frame, 1.25), stroke: color, width: 2.5 },
        { type: 'path', segs: orientedRectSegs(frame, 4.5), stroke: color, width: 0.75 },
        { type: 'text', text: label, at: orientedPoint(frame, center, h * 0.56), align: 'middle', angle: frame.turn, size: h * 0.36, bold: true, color },
        { type: 'text', text: markup.date, at: orientedPoint(frame, center, h * 0.82), align: 'middle', angle: frame.turn, size: h * 0.18, bold: false, color },
      ]
    }
  }
}

export interface TextBoxLayout {
  lines: string[]
  width: number
  height: number
}

/**
 * Bố cục khung chữ (theo chiều chữ) — đo lúc tạo/kéo, lưu vào dấu để xuất khỏi
 * phải đo lại. Có `wrap` thì khung rộng đúng bằng nó và chữ tự xuống dòng; không
 * có thì khung ôm dòng dài nhất.
 */
export function textBoxLayout(text: string, size: number, measure: MeasureText, padding = 0, wrap?: number): TextBoxLayout {
  const lines = wrap === undefined ? text.split('\n') : wrapText(text, wrap, (line) => measure(line, size, false))
  const width = wrap ?? Math.max(...lines.map((line) => measure(line, size, false)))
  const height = ((lines.length - 1) * LINE_HEIGHT + ASCENT + DESCENT) * size
  return { lines, width: width + padding * 2, height: height + padding * 2 }
}

export function textFrameSize(text: string, size: number, measure: MeasureText, padding = 0, wrap?: number) {
  const { width, height } = textBoxLayout(text, size, measure, padding, wrap)
  return { width, height }
}

export function noteFrameSize(text: string, measure: MeasureText, wrap?: number) {
  return textFrameSize(text, NOTE_FONT_SIZE, measure, NOTE_PADDING, wrap)
}

/** Kéo hẹp tới mức này thì dừng — hẹp hơn là mỗi dòng còn một chữ cái. */
export function minTextWrap(fontSize: number): number {
  return fontSize * 3
}

export function stampFrameSize(preset: StampPreset, date: string, measure: MeasureText, height = STAMP_HEIGHT) {
  const label = measure(stampLabel(preset), height * 0.36, true)
  const small = measure(date, height * 0.18, false)
  return { width: Math.max(label, small) + height * 0.7, height }
}

export function markupBounds(markup: Markup): Rect {
  switch (markup.kind) {
    case 'pen': {
      const xs = markup.points.map((point) => point.x)
      const ys = markup.points.map((point) => point.y)
      const pad = markup.width / 2
      return {
        x: Math.min(...xs) - pad,
        y: Math.min(...ys) - pad,
        width: Math.max(...xs) - Math.min(...xs) + pad * 2,
        height: Math.max(...ys) - Math.min(...ys) + pad * 2,
      }
    }
    case 'line':
    case 'arrow':
      return rectFromPoints(markup.from, markup.to)
    case 'rect':
    case 'ellipse':
    case 'cloud':
    case 'highlight':
    case 'redact':
      return markup.box
    case 'textEdit':
      return orientedBounds({
        ...markup.frame,
        width: Math.max(markup.frame.width, markup.cover.width),
        height: Math.max(markup.frame.height, markup.cover.height),
      })
    default:
      return orientedBounds(markup.frame)
  }
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  const t = lengthSq === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
}

function distanceToPolyline(p: Point, points: Point[]): number {
  if (points.length === 1) return Math.hypot(p.x - points[0].x, p.y - points[0].y)
  let best = Infinity
  for (let index = 1; index < points.length; index++) best = Math.min(best, distanceToSegment(p, points[index - 1], points[index]))
  return best
}

function inside(p: Point, box: Rect, pad: number): boolean {
  return p.x >= box.x - pad && p.x <= box.x + box.width + pad && p.y >= box.y - pad && p.y <= box.y + box.height + pad
}

/**
 * Điểm `p` có chạm dấu không. Hình viền (chữ nhật, ellipse, mây) chỉ bắt ở
 * NÉT — bấm vào giữa khung lớn vẫn chọn được dấu nằm bên trong nó.
 */
export function hitsMarkup(markup: Markup, p: Point, tolerance: number): boolean {
  switch (markup.kind) {
    case 'pen':
      return distanceToPolyline(p, markup.points) <= tolerance + markup.width / 2
    case 'line':
    case 'arrow':
      return distanceToSegment(p, markup.from, markup.to) <= tolerance + markup.width / 2
    case 'rect':
    case 'cloud': {
      const { x, y, width, height } = markup.box
      const edges = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
        { x, y },
      ]
      return distanceToPolyline(p, edges) <= tolerance + markup.width / 2 + (markup.kind === 'cloud' ? 6 : 0)
    }
    case 'ellipse': {
      const rx = markup.box.width / 2
      const ry = markup.box.height / 2
      if (rx === 0 || ry === 0) return inside(p, markup.box, tolerance)
      const d = Math.hypot((p.x - markup.box.x - rx) / rx, (p.y - markup.box.y - ry) / ry)
      return Math.abs(d - 1) * Math.min(rx, ry) <= tolerance + markup.width / 2
    }
    default:
      return inside(p, markupBounds(markup), tolerance)
  }
}

/** Dấu trên cùng tại `p` (vẽ sau nằm trên). */
export function markupAt(markups: Markup[], p: Point, tolerance: number): Markup | undefined {
  for (let index = markups.length - 1; index >= 0; index--) {
    if (hitsMarkup(markups[index], p, tolerance)) return markups[index]
  }
  return undefined
}

export function moveMarkup(markup: Markup, dx: number, dy: number): Markup {
  const shift = (p: Point): Point => ({ x: p.x + dx, y: p.y + dy })
  switch (markup.kind) {
    case 'pen':
      return { ...markup, points: markup.points.map(shift) }
    case 'line':
    case 'arrow':
      return { ...markup, from: shift(markup.from), to: shift(markup.to) }
    case 'rect':
    case 'ellipse':
    case 'cloud':
    case 'highlight':
    case 'redact':
      return { ...markup, box: { ...markup.box, x: markup.box.x + dx, y: markup.box.y + dy } }
    default:
      return { ...markup, frame: { ...markup.frame, origin: shift(markup.frame.origin) } }
  }
}

/** `end` = mép cuối dòng của khung chữ — chỉ kéo giãn bề rộng ngắt dòng. */
export type HandleId = 'from' | 'to' | 'nw' | 'ne' | 'se' | 'sw' | 'end'

const OPPOSITE: Record<'nw' | 'ne' | 'se' | 'sw', 'nw' | 'ne' | 'se' | 'sw'> = { nw: 'se', ne: 'sw', se: 'nw', sw: 'ne' }

function corner(box: Rect, id: 'nw' | 'ne' | 'se' | 'sw'): Point {
  return {
    x: id === 'nw' || id === 'sw' ? box.x : box.x + box.width,
    y: id === 'nw' || id === 'ne' ? box.y : box.y + box.height,
  }
}

/**
 * Tay nắm đổi cỡ. Nét bút chỉ di chuyển; chữ / ghi chú chỉ kéo được BỀ RỘNG
 * (chữ tự xuống dòng, cỡ chữ giữ nguyên) — kéo giãn cả hai chiều là méo chữ.
 */
export function markupHandles(markup: Markup): { id: HandleId; p: Point }[] {
  switch (markup.kind) {
    case 'pen':
      return []
    case 'text':
    case 'note':
      return [{ id: 'end', p: orientedPoint(markup.frame, markup.frame.width, markup.frame.height / 2) }]
    case 'line':
    case 'arrow':
      return [
        { id: 'from', p: markup.from },
        { id: 'to', p: markup.to },
      ]
    case 'textEdit':
      return markup.text ? [{ id: 'end', p: orientedPoint(markup.frame, markup.frame.width, markup.frame.height / 2) }] : []
    default: {
      const box = markupBounds(markup)
      return (['nw', 'ne', 'se', 'sw'] as const).map((id) => ({ id, p: corner(box, id) }))
    }
  }
}

const MIN_SIZE = 4

export function resizeMarkup(markup: Markup, handle: HandleId, p: Point): Markup {
  if (markup.kind === 'line' || markup.kind === 'arrow') {
    return handle === 'from' ? { ...markup, from: p } : handle === 'to' ? { ...markup, to: p } : markup
  }
  if (markup.kind === 'textEdit' || markup.kind === 'text' || markup.kind === 'note') {
    if (handle !== 'end') return markup
    const axis = turnAxes(markup.frame.turn).x
    const along = (p.x - markup.frame.origin.x) * axis.x + (p.y - markup.frame.origin.y) * axis.y
    if (markup.kind === 'textEdit') {
      return { ...markup, frame: { ...markup.frame, width: Math.max(markup.fontSize * 2 + markup.inset * 2, along) } }
    }
    // Chỉ đổi bề rộng; dòng + chiều cao do `laidOutTextBox` tính lại (cần phép đo chữ).
    const padding = markup.kind === 'note' ? NOTE_PADDING : 0
    const size = markup.kind === 'note' ? NOTE_FONT_SIZE : markup.fontSize
    const wrap = Math.max(minTextWrap(size), along - padding * 2)
    return { ...markup, wrap, frame: { ...markup.frame, width: wrap + padding * 2 } }
  }
  if (handle === 'from' || handle === 'to' || handle === 'end') return markup

  const fixed = corner(markupBounds(markup), OPPOSITE[handle])
  const next = rectFromPoints(fixed, p)
  const box = { ...next, width: Math.max(MIN_SIZE, next.width), height: Math.max(MIN_SIZE, next.height) }
  switch (markup.kind) {
    case 'rect':
    case 'ellipse':
    case 'cloud':
    case 'highlight':
    case 'redact':
      return { ...markup, box }
    case 'underline':
    case 'strikeout':
    case 'stamp':
      return { ...markup, frame: orientedFromBounds(box, markup.frame.turn) }
    default:
      return markup
  }
}

/** Bỏ điểm sát nhau của nét bút — chuột 1000Hz sinh hàng nghìn điểm cho một nét. */
export function simplifyStroke(points: Point[], minDistance: number): Point[] {
  if (points.length <= 2) return points
  const kept = [points[0]]
  for (const point of points.slice(1, -1)) {
    const last = kept[kept.length - 1]
    if (Math.hypot(point.x - last.x, point.y - last.y) >= minDistance) kept.push(point)
  }
  kept.push(points[points.length - 1])
  return kept
}

export function hasMarkups(pages: { markups?: Markup[] }[]): boolean {
  return pages.some((page) => (page.markups?.length ?? 0) > 0)
}
