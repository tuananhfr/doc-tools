import type { TextRun } from '../types/text-layer.types'
import { turnAxes, type Point, type QuarterTurn } from './page-geometry'
import type { PageObject } from './reflow-layout'
import { looksLikeColumn } from './reflow-zones'
import { proportionalMeasure, type RunMeasure } from './text-search'
import { isListMarker, lineAround, lineSegments, type Caret } from './text-select'

/**
 * Dò ĐOẠN VĂN quanh một dòng chữ. PDF không ghi đoạn văn — chỉ có các dòng rời
 * nhau — nên phải suy ra từ hình học: cùng cỡ chữ, cách đều, thẳng mép trái, và
 * dòng trên phải "đầy" (từ đầu của dòng dưới không còn chỗ chen lên).
 *
 * Mọi chỗ chưa chắc đều nghiêng về KHÔNG nối: nối nhầm hai đoạn là sửa đoạn này
 * kéo chữ đoạn kia chảy lên, còn nối thiếu thì người dùng vẫn kéo chọn thêm được.
 */

interface Line {
  first: number
  last: number
  u0: number
  u1: number
  /** Chân chữ. */
  v: number
  top: number
  bottom: number
  size: number
  text: string
}

/** Hai dòng lệch mép trái trong ngần này (theo cỡ chữ) là thẳng hàng. */
const SAME_LEFT = 0.3
const MIN_PITCH = 0.9
const MAX_PITCH = 2
// Khoảng cách đoạn thường chỉ hơn giãn dòng vài điểm — lệch quá ngần này là sang đoạn khác.
const PITCH_SLACK = 0.12
const RULE_WIDTH = 3
const SPACE = 0.25
/** Hai dòng của một cột cách nhau tới ngần này (theo cỡ chữ) vẫn là liền kề: giữa hai đoạn thường có khoảng cách đoạn. */
const COLUMN_GAP = 3.5
/** Khe cột phải có ít nhất ngần này dòng liền kề có chữ bên phải mới tin. */
const GUTTER_LINES = 3
// Chrome ghi số thứ tự liền vào chữ ("1. Kiểm tra…"); Word tách nó thành một khúc riêng (`isListMarker`).
const STARTS_ITEM = /^(\(?(\d{1,3}|[a-zđ]|[ivxlIVXL]{1,5})[.)]|[-–—•*+])\s/

/**
 * Hai con trỏ ôm trọn đoạn văn chứa mảnh `index`; chỉ ôm khúc chữ của chính dòng
 * ấy khi không chắc có đoạn. `objects` (nội dung trang) để dừng ở nét kẻ bảng.
 */
export function paragraphAround(runs: TextRun[], index: number, measure: RunMeasure = proportionalMeasure, objects: PageObject[] = []): [Caret, Caret] {
  const single = lineAround(runs, index)
  const segments = lineSegments(runs, measure)
  const home = segments.find((segment) => index >= segment.first && index <= segment.last)
  if (!home) return single

  const origin = home.span.start
  const axes = turnAxes(home.span.angle as QuarterTurn)
  const point = (p: Point) => {
    const dx = p.x - origin.x
    const dy = p.y - origin.y
    return { u: dx * axes.x.x + dy * axes.x.y, v: dx * axes.y.x + dy * axes.y.y }
  }
  const lines: Line[] = segments
    .filter((segment) => segment.span.angle === home.span.angle)
    .map(({ first, last, span }) => {
      const at = point(span.start)
      return { first, last, u0: at.u, u1: at.u + span.length, v: at.v, top: span.top, bottom: span.bottom, size: span.size, text: span.text }
    })
  const size = home.span.size
  const body = lines.filter((line) => Math.abs(line.size - size) <= size * 0.05)
  const me = body.find((line) => line.first === home.first)
  if (!me) return single

  const rules = objects
    .filter((object) => object.kind === 'path')
    .map(({ box }) => {
      const a = point({ x: box.x, y: box.y })
      const b = point({ x: box.x + box.width, y: box.y + box.height })
      return { u0: Math.min(a.u, b.u), u1: Math.max(a.u, b.u), v0: Math.min(a.v, b.v), v1: Math.max(a.v, b.v) }
    })

  const overlap = (a: Line, b: Line) => Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0)
  const sameRow = (a: Line, b: Line) => Math.abs(a.v - b.v) < size * 0.3

  /** Dòng liền kề phía `step` (1 = dưới) trong cùng cột chữ, cách không quá `reach` lần cỡ chữ — mặc định là đúng tầm một dòng. */
  const next = (line: Line, step: 1 | -1, reach = MAX_PITCH): Line | null => {
    let best: Line | null = null
    for (const other of body) {
      const gap = (other.v - line.v) * step
      if (gap < size * MIN_PITCH || gap > size * reach || overlap(other, line) <= 0) continue
      const nearer = !best || gap < (best.v - line.v) * step - size * 0.3
      const wider = best && sameRow(other, best) && overlap(other, line) > overlap(best, line)
      if (nearer || wider) best = other
    }
    return best
  }

  // Nét kẻ ngang giữa hai dòng = hai hàng của một bảng, không phải hai dòng của một đoạn.
  const ruled = (upper: Line, lower: Line) =>
    rules.some((rule) => rule.v1 - rule.v0 <= RULE_WIDTH && rule.v0 > upper.v && rule.v1 < lower.v && rule.u0 < upper.u1 && rule.u1 > upper.u0)

  const startsItem = (line: Line) =>
    STARTS_ITEM.test(line.text) || lines.some((other) => sameRow(other, line) && other.u1 <= line.u0 + size * 0.1 && isListMarker(other.text))

  /** Mép trái của chữ nằm bên phải dòng (cột bên cạnh, ô bảng kế bên); `Infinity` khi bên phải trống. */
  const beside = (line: Line) => {
    const level = lines.filter((other) => other !== line && other.v + other.top < line.v + line.bottom && other.v + other.bottom > line.v + line.top)
    return Math.min(Infinity, ...level.filter((other) => other.u0 >= line.u1 - size * 0.5).map((other) => other.u0 - size * 0.5))
  }

  // Khe cột bên phải, dò qua các dòng LIỀN KỀ dòng này: trang hai cột hay có đoạn trải cả trang ở dưới, lấy nó làm
  // mép cột thì không dòng nào của cột "đầy". Đi lên rồi đi xuống, dừng ở dòng vắt qua khe (đoạn trải cả trang) và ở
  // dòng có chữ bên phải nằm LỌT trong bề rộng các dòng đã qua — đó là một hàng "Bên A … Bên B", không phải khe cột.
  const stack = [me]
  const edges = [beside(me)]
  let reach = me.u1
  for (const step of [-1, 1] as const) {
    for (let line = next(me, step, COLUMN_GAP); line; line = next(line, step, COLUMN_GAP)) {
      const edge = beside(line)
      if (line.u1 > Math.min(...edges) || edge < reach) break
      reach = Math.max(reach, line.u1)
      stack.push(line)
      edges.push(edge)
    }
  }
  const backed = edges.filter(Number.isFinite)
  // Tin nhầm một khe là mép cột co lại, dòng cụt cuối đoạn cũng thành "đầy" và bị nối với dòng dưới. Nên các dòng liền
  // kề phải ra dáng cột chữ: danh sách "Chủ đầu tư: … / Nhà thầu: …" cũng có chữ bên phải từng dòng mà không phải cột.
  const columnar = looksLikeColumn(
    stack.map((line) => ({ text: true, u0: line.u0, u1: line.u1, v0: line.v + line.top, v1: line.v + line.bottom, base: line.v })),
    size,
  )
  // Mép phải của cột: có khe cột thì là dòng dài nhất trong các dòng liền kề; không thì là dòng dài nhất nằm cùng cột
  // trên cả trang. Kiểu nào cũng dừng trước ô bên cạnh và nét kẻ dọc của bảng.
  const column = columnar && backed.length >= GUTTER_LINES ? reach : Math.max(...body.filter((line) => overlap(line, me) > 0).map((line) => line.u1))
  const rightOf = (line: Line) => {
    let limit = column
    for (const other of lines) {
      if (other !== line && sameRow(other, line) && other.u0 >= line.u1 - size * 0.5) limit = Math.min(limit, other.u0 - size * 0.5)
    }
    for (const rule of rules) {
      const crosses = rule.v0 < line.v + line.bottom && rule.v1 > line.v + line.top
      if (crosses && rule.u1 - rule.u0 <= RULE_WIDTH && rule.u0 >= line.u1 - size * 0.5) limit = Math.min(limit, rule.u0 - size * 0.3)
    }
    return limit
  }

  /** Bề rộng từ đầu tiên của dòng, đo trên mảnh chữ đầu dòng. Chia đều theo số ký tự thì "được", "ánh" hụt cả chục phần trăm. */
  const firstWord = (line: Line) => {
    const run = runs[line.first]
    const start = Math.max(0, run.text.search(/\S/))
    const space = run.text.slice(start).search(/\s/)
    return measure(run, space < 0 ? run.text.length : start + space) - measure(run, start)
  }

  /** Dòng trên đã đầy: từ đầu của dòng dưới không chen lên được. */
  const full = (upper: Line, lower: Line) => upper.u1 + size * SPACE + firstWord(lower) > rightOf(upper)

  let pitch: number | null = null
  const joins = (upper: Line, lower: Line) => {
    const gap = lower.v - upper.v
    if (pitch !== null && Math.abs(gap - pitch) > size * PITCH_SLACK) return false
    return !ruled(upper, lower) && !startsItem(lower) && full(upper, lower)
  }
  const aligned = (a: Line, b: Line) => Math.abs(a.u0 - b.u0) <= size * SAME_LEFT

  const chain = [me]
  const below = next(me, 1)
  // Dòng dưới thụt ra ngoài mép trái của dòng này = dòng này là dòng đầu thụt vào của đoạn: phía trên là đoạn khác.
  const indentedFirst = below !== null && below.u0 < me.u0 - size * SAME_LEFT
  if (!startsItem(me) && !indentedFirst) {
    for (let current = me, above = next(current, -1); above && joins(above, current); above = next(current, -1)) {
      chain.unshift(above)
      pitch ??= current.v - above.v
      // Dòng lệch mép trái (thụt đầu dòng hoặc thụt treo) và dòng mang ký hiệu là dòng đầu đoạn — dừng ở đó.
      if (!aligned(above, current) || startsItem(above)) break
      current = above
    }
  }

  // Mép trái chung của các dòng sau dòng đầu; chưa biết khi đoạn mới chỉ có dòng đầu.
  let left = chain.length > 1 ? me.u0 : null
  for (let current = me, after = next(current, 1); after && joins(current, after); after = next(current, 1)) {
    if (left === null) {
      // Dòng sau thụt SÂU hơn dòng đầu chỉ có ở mục đánh số; còn lại là dòng đầu thụt vào của đoạn kế tiếp.
      if (after.u0 > current.u0 + size * SAME_LEFT && !startsItem(current)) break
      left = after.u0
    } else if (Math.abs(after.u0 - left) > size * SAME_LEFT) {
      break
    }
    chain.push(after)
    pitch ??= after.v - current.v
    current = after
  }

  if (chain.length === 1) return single
  // `selectedLines` đi theo thứ tự mảnh chữ trong tệp: có khúc chữ lạ chen giữa (ô bảng kế bên) là lấy nhầm cả nó.
  const [top, bottom] = [chain[0], chain[chain.length - 1]]
  const inside = new Set(chain.map((line) => line.first))
  const inOrder = chain.every((line, at) => at === 0 || line.first > chain[at - 1].last)
  if (!inOrder || segments.some((segment) => segment.first >= top.first && segment.last <= bottom.last && !inside.has(segment.first))) return single
  return [
    { run: top.first, offset: 0 },
    { run: bottom.last, offset: runs[bottom.last].text.length },
  ]
}
