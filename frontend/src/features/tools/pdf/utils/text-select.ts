import type { TextRun } from '../types/text-layer.types'
import type { Point } from './page-geometry'
import { proportionalMeasure, type RunMeasure } from './text-search'

/**
 * Chọn chữ bằng cách kéo, như bôi đen trong trình đọc PDF: điểm nhấn và điểm
 * thả thành hai con trỏ giữa hai ký tự, đoạn giữa đi theo thứ tự mảnh chữ trong
 * tệp. Toạ độ là khung gốc (pt) — cùng khung với lớp chữ và dấu.
 */

/** Vị trí giữa hai ký tự: `offset` 0..độ dài mảnh. */
export interface Caret {
  run: number
  offset: number
}

/** Một dòng đã chọn: đoạn trên đường chân chữ từ `start` dài `length`, cao từ `top` (âm) tới `bottom`. */
export interface LineSpan {
  start: Point
  /** Góc chữ (độ, ngược chiều kim đồng hồ), luôn là bội của 90. */
  angle: number
  length: number
  top: number
  bottom: number
  /** Chữ đã chọn trên dòng — mảnh cách xa nhau được nối bằng dấu cách như lớp tìm chữ. */
  text: string
  /** Cỡ chữ lớn nhất trên dòng. */
  size: number
  /** Mảnh đầu dòng — để đoán phông. */
  run: number
}

const rad = (degrees: number) => (degrees * Math.PI) / 180

// Chữ nghiêng lệch (không phải bội 90°) không bám được: dấu chỉ biết khung thẳng hoặc xoay vuông góc.
const ANGLE_SLACK = 1.5

function quarterAngle(angle: number): number | null {
  const normalized = ((angle % 360) + 360) % 360
  const quarter = Math.round(normalized / 90) * 90
  return Math.abs(normalized - quarter) <= ANGLE_SLACK ? quarter % 360 : null
}

function snappable(run: TextRun): boolean {
  return run.text.trim().length > 0 && run.width > 0 && quarterAngle(run.angle) !== null
}

function axes(angle: number) {
  const a = rad(angle)
  return { along: { x: Math.cos(a), y: -Math.sin(a) }, down: { x: Math.sin(a), y: Math.cos(a) } }
}

/** Toạ độ của điểm trong hệ của mảnh: `u` dọc dòng từ đầu mảnh, `v` xuống dưới tính từ chân chữ. */
function local(run: TextRun, p: Point) {
  const { along, down } = axes(quarterAngle(run.angle) ?? run.angle)
  const dx = p.x - run.origin.x
  const dy = p.y - run.origin.y
  return { u: dx * along.x + dy * along.y, v: dx * down.x + dy * down.y }
}

function distanceTo(run: TextRun, p: Point): number {
  const { u, v } = local(run, p)
  const du = Math.max(0, -u, u - run.width)
  const dv = Math.max(0, -run.ascent * run.size - v, v - run.descent * run.size)
  return Math.hypot(du, dv)
}

function offsetAt(run: TextRun, u: number, measure: RunMeasure): number {
  let best = 0
  let bestGap = Infinity
  for (let k = 0; k <= run.text.length; k++) {
    const gap = Math.abs(measure(run, k) - u)
    if (gap < bestGap) {
      best = k
      bestGap = gap
    }
  }
  return best
}

/**
 * Con trỏ gần `p` nhất. `reach` = khoảng cách tối đa tới khung chữ; `Infinity`
 * để điểm thả rơi vào khoảng trống giữa hai dòng vẫn bám được dòng gần nhất.
 */
export function caretAt(runs: TextRun[], p: Point, reach: number, measure: RunMeasure = proportionalMeasure): Caret | null {
  const run = runAt(runs, p, reach)
  return run < 0 ? null : { run, offset: offsetAt(runs[run], local(runs[run], p).u, measure) }
}

/** Mảnh chữ gần `p` nhất trong tầm `reach`, -1 nếu không có — rẻ, không đo chữ (dùng khi rê chuột). */
export function runAt(runs: TextRun[], p: Point, reach: number): number {
  let best = -1
  let bestDistance = Infinity
  runs.forEach((run, index) => {
    if (!snappable(run)) return
    const distance = distanceTo(run, p)
    if (distance < bestDistance) {
      best = index
      bestDistance = distance
    }
  })
  return bestDistance > reach ? -1 : best
}

function sameLine(a: TextRun, b: TextRun): boolean {
  if (quarterAngle(a.angle) !== quarterAngle(b.angle)) return false
  const { down } = axes(quarterAngle(a.angle) ?? 0)
  const offLine = (b.origin.x - a.origin.x) * down.x + (b.origin.y - a.origin.y) * down.y
  return Math.abs(offLine) < Math.max(a.size, b.size) * 0.3
}

/** Đoạn chữ giữa hai con trỏ (thứ tự nào cũng được), gộp mỗi dòng thành một khúc; bỏ khoảng trắng hai đầu. */
export function selectedLines(runs: TextRun[], a: Caret, b: Caret, measure: RunMeasure = proportionalMeasure): LineSpan[] {
  const [first, last] = a.run < b.run || (a.run === b.run && a.offset <= b.offset) ? [a, b] : [b, a]
  const lines: { index: number; run: TextRun; angle: number; from: number; to: number; top: number; bottom: number; text: string; size: number }[] = []

  for (let index = first.run; index <= last.run; index++) {
    const run = runs[index]
    if (!run || !snappable(run)) continue
    let from = index === first.run ? first.offset : 0
    let to = index === last.run ? last.offset : run.text.length
    while (from < to && /\s/.test(run.text[from])) from++
    while (to > from && /\s/.test(run.text[to - 1])) to--
    if (from >= to) continue

    const angle = quarterAngle(run.angle) ?? 0
    const top = -run.ascent * run.size
    const bottom = run.descent * run.size
    const piece = run.text.slice(from, to)
    const line = lines[lines.length - 1]
    if (line && sameLine(line.run, run)) {
      // Đo phần mới theo trục của mảnh đầu dòng — mảnh sau có thể bắt đầu ở cỡ chữ khác.
      const start = local(line.run, localPoint(run, measure(run, from))).u
      const end = local(line.run, localPoint(run, measure(run, to))).u
      line.text += start - line.to > Math.max(line.size, run.size) * 0.15 ? ` ${piece}` : piece
      line.from = Math.min(line.from, start)
      line.to = Math.max(line.to, end)
      line.top = Math.min(line.top, top)
      line.bottom = Math.max(line.bottom, bottom)
      line.size = Math.max(line.size, run.size)
    } else {
      lines.push({ index, run, angle, from: measure(run, from), to: measure(run, to), top, bottom, text: piece, size: run.size })
    }
  }

  return lines.map((line) => ({
    start: localPoint(line.run, line.from),
    angle: line.angle,
    length: line.to - line.from,
    top: line.top,
    bottom: line.bottom,
    text: line.text,
    size: line.size,
    run: line.index,
  }))
}

// Khoảng trống rộng hơn một ô chữ là sang ô bảng / cột khác, không còn là dấu cách giữa hai từ.
const SEGMENT_GAP = 1
const MARKER_GAP = 0.3
// Chấm đầu dòng của Word nằm ở phông Symbol, vùng dùng riêng (U+F0B7) — đọc ra là ô vuông.
const BULLET = /^[-·•‣⁃■□▪○●◦]+$/
const ORDINAL = /^((\d{1,3}|[a-zA-Z]|[ivxlIVXL]{1,5})[.)]|[-+*–—])$/

const blank = (run: TextRun) => run.text.trim().length === 0

/** Ký hiệu / số thứ tự đầu dòng của danh sách khi nó đứng thành một khúc chữ riêng. */
export function isListMarker(text: string): boolean {
  const marker = text.trim()
  return BULLET.test(marker) || ORDINAL.test(marker)
}

/** Mảnh có chữ kế bên trên cùng dòng (`step` = hướng đi), -1 nếu hết dòng. */
function neighbour(runs: TextRun[], index: number, step: 1 | -1): number {
  for (let next = index + step; runs[next] && sameLine(runs[index], runs[next]); next += step) {
    if (!blank(runs[next])) return next
  }
  return -1
}

/** Giữa hai mảnh liền nhau `a` → `b` trên cùng dòng có phải chỗ đứt khúc không. */
function breaksBetween(runs: TextRun[], a: number, b: number): boolean {
  const size = Math.max(runs[a].size, runs[b].size)
  const gap = local(runs[a], runs[b].origin).u - runs[a].width
  if (gap > size * SEGMENT_GAP) return true
  // Ký hiệu / số thứ tự đầu dòng: sửa chữ mà kéo theo nó là mất thụt lề của danh sách.
  if (neighbour(runs, a, -1) >= 0) return false
  const marker = runs[a].text.trim()
  return BULLET.test(marker) || (ORDINAL.test(marker) && gap > size * MARKER_GAP)
}

/**
 * Khúc chữ liền nhau chứa mảnh `index`: cùng dòng và không bị khoảng trống rộng
 * hay ký hiệu đầu dòng ngăn ra. Trả chỉ số mảnh đầu và mảnh cuối.
 */
export function segmentAround(runs: TextRun[], index: number): [number, number] {
  let first = index
  let last = index
  for (let prev = neighbour(runs, first, -1); prev >= 0 && !breaksBetween(runs, prev, first); prev = neighbour(runs, first, -1)) first = prev
  for (let next = neighbour(runs, last, 1); next >= 0 && !breaksBetween(runs, last, next); next = neighbour(runs, last, 1)) last = next
  return [first, last]
}

/** Hai con trỏ ôm trọn khúc chữ chứa mảnh `index` — bấm (không kéo) bằng công cụ Sửa chữ là sửa cả khúc. */
export function lineAround(runs: TextRun[], index: number): [Caret, Caret] {
  const [first, last] = segmentAround(runs, index)
  return [
    { run: first, offset: 0 },
    { run: last, offset: runs[last].text.length },
  ]
}

/** Nới hai con trỏ (thứ tự nào cũng được) ra trọn khúc chữ ở hai đầu — viết lại trang thì phải lấy cả khúc, không lấy nửa chừng. */
export function wholeSegments(runs: TextRun[], a: Caret, b: Caret): [Caret, Caret] {
  const [first, last] = a.run < b.run || (a.run === b.run && a.offset <= b.offset) ? [a, b] : [b, a]
  // Thả chuột ở đầu dòng kế tiếp là chưa chọn chữ nào của dòng ấy.
  let end = last.run
  if (last.offset === 0) while (end > first.run && (end === last.run || blank(runs[end]))) end--
  const from = segmentAround(runs, first.run)[0]
  const to = segmentAround(runs, end)[1]
  return [
    { run: from, offset: 0 },
    { run: to, offset: runs[to].text.length },
  ]
}

/** Một khúc chữ của trang: các mảnh `first`…`last` nằm trên một dòng. */
export interface LineSegment {
  first: number
  last: number
  span: LineSpan
}

/** Mọi khúc chữ của trang, theo thứ tự mảnh chữ trong tệp. */
export function lineSegments(runs: TextRun[], measure: RunMeasure = proportionalMeasure): LineSegment[] {
  const segments: LineSegment[] = []
  let done = -1
  runs.forEach((run, index) => {
    if (index <= done || !snappable(run)) return
    const [first, last] = segmentAround(runs, index)
    done = Math.max(done, last)
    for (const span of selectedLines(runs, { run: first, offset: 0 }, { run: last, offset: runs[last].text.length }, measure)) segments.push({ first, last, span })
  })
  return segments
}

/** Mọi khúc chữ của trang, mỗi khúc một dòng — để dò mép cột và khoảng cách dòng quanh chỗ đang sửa. */
export function pageSegments(runs: TextRun[], measure: RunMeasure = proportionalMeasure): LineSpan[] {
  return lineSegments(runs, measure).map((segment) => segment.span)
}

function localPoint(run: TextRun, u: number): Point {
  const { along } = axes(quarterAngle(run.angle) ?? run.angle)
  return { x: run.origin.x + along.x * u, y: run.origin.y + along.y * u }
}
