import type { Rect } from '../types/markup.types'
import { turnAxes, type Point, type QuarterTurn, type Size } from './page-geometry'
import { bodyBounds, columnPart, footerTop, sideColumns, type BodyBounds, type SideColumns, type ZoneItem } from './reflow-zones'
import type { LineSpan } from './text-select'
import { wrapText } from './text-wrap'

/**
 * Bố cục của một lần VIẾT LẠI TRANG khi sửa chữ: khối chữ đang sửa, chỗ ngắt
 * dòng, những gì phải dời theo. Mọi phép đo nằm trong hệ của chính khối chữ —
 * `u` dọc dòng, `v` xuống dưới, gốc ở đầu chân chữ dòng đầu — nên chữ dọc hay
 * trang xoay đều chạy chung một công thức. Toạ độ vào/ra là khung gốc (pt).
 */

export type PageObjectKind = 'text' | 'path' | 'image' | 'shading' | 'form'

/** Một đối tượng trong nội dung trang, theo đúng thứ tự PDFium liệt kê. */
export interface PageObject {
  kind: PageObjectKind
  box: Rect
  /** Gốc đường chân chữ — chỉ đối tượng chữ có. */
  anchor?: Point
  /** Hình có nét viền (stroke) — kéo dài nó là nét ngang dày lên theo. */
  stroked?: boolean
}

export interface BlockLine {
  u: number
  v: number
  length: number
  /** Mép trên (âm) / dưới của dòng, tính từ chân chữ. */
  top: number
  bottom: number
}

export interface ReflowBlock {
  /** Đầu chân chữ dòng đầu. */
  origin: Point
  turn: QuarterTurn
  size: number
  /** Các dòng chữ gốc, từ trên xuống. */
  lines: BlockLine[]
  /** Mép trái của các dòng SAU dòng đầu (dòng đầu luôn ở `u` = 0) — giữ thụt đầu dòng / thụt treo. */
  left: number
  /** Mép phải ngắt dòng. */
  right: number
  /** Khoảng cách hai chân chữ liền nhau. */
  pitch: number
}

/** Thân bài của trang và những phần đứng yên khi phần dưới khối bị đẩy — xem `reflow-zones.ts`. */
export interface ReflowZones extends BodyBounds {
  /** Mép trên của chân trang. */
  footer: number | null
  columns: SideColumns | null
}

export interface ReflowPlan {
  block: ReflowBlock
  /** Chỉ số các đối tượng chữ gốc của khối — bị gỡ khỏi trang. */
  remove: number[]
  zones: ReflowZones
}

/** Một đối tượng của trang và độ dời dọc `v` của nó. */
export interface Nudge {
  index: number
  by: number
}

/** Một trang mới chứa phần tràn, chèn ngay sau trang đang sửa. */
export interface SpillPage {
  /** Mép trên của phần này trên trang gốc sau khi đã dời. */
  from: number
  /** Dời thêm dọc `v` để phần này bắt đầu từ lề trên của trang mới. */
  lift: number
  objects: Nudge[]
  /** Các dòng chữ mới nằm ở trang này: [từ, tới). */
  lines: [number, number]
}

export interface ShiftPlan {
  /** Độ dời dọc theo `v` (pt); âm = kéo phần dưới lên. */
  delta: number
  /** Những gì dời theo `delta` và còn ở lại trang này. */
  move: number[]
  /**
   * Phần nằm dưới vùng nhiều cột dời theo độ dời riêng: cột đang sửa dài ra mà vẫn ngắn hơn cột bên cạnh thì nó
   * không phải nhúc nhích, và cột ngắn lại cũng không được kéo nó đè lên cột bên cạnh.
   */
  tailDelta: number
  tail: number[]
  /** Nét kẻ dọc / nền ô vắt qua khối: giữ mép trên, mép dưới dời theo `by` (không quá mép dưới thân bài). */
  stretch: Nudge[]
  /** Số dòng chữ mới còn nằm ở trang này. */
  keep: number
  /** Phần bị đẩy quá mép dưới thân bài, mỗi phần tử một trang mới. */
  spill: SpillPage[]
}

interface Band {
  u0: number
  u1: number
  v0: number
  v1: number
}

const DEFAULT_PITCH = 1.2
// Dòng kế bên cách xa hơn thế này là đã sang đoạn khác (có khoảng cách đoạn), không còn là giãn dòng.
const MAX_PITCH = 2
const MIN_PITCH = 0.9
/** Nét kẻ dọc của bảng: mảnh hơn thế này mới coi là đường kẻ, không phải hình. */
const RULE_WIDTH = 3
/** Hai nét kẻ của bảng nối nhau: Chrome vẽ chờm nhau đúng một bề dày nét. */
const JOIN = 1.5

function frameOf(origin: Point, turn: QuarterTurn) {
  const axes = turnAxes(turn)
  const point = (p: Point) => {
    const dx = p.x - origin.x
    const dy = p.y - origin.y
    return { u: dx * axes.x.x + dy * axes.x.y, v: dx * axes.y.x + dy * axes.y.y }
  }
  // Xoay bội 90°: hai góc đối là đủ dựng lại khung bao.
  const band = (box: Rect): Band => {
    const a = point({ x: box.x, y: box.y })
    const b = point({ x: box.x + box.width, y: box.y + box.height })
    return { u0: Math.min(a.u, b.u), u1: Math.max(a.u, b.u), v0: Math.min(a.v, b.v), v1: Math.max(a.v, b.v) }
  }
  return { point, band }
}

const lastBaseline = (lines: BlockLine[]) => lines[lines.length - 1].v

/** Các dòng đã chọn → hình học của khối; `null` khi các dòng không xếp từ trên xuống (kéo ngược cột, chữ lẫn hướng). */
function blockGeometry(spans: LineSpan[]): Pick<ReflowBlock, 'origin' | 'turn' | 'size' | 'lines'> | null {
  const first = spans[0]
  if (!first || spans.some((span) => span.angle !== first.angle)) return null
  const turn = first.angle as QuarterTurn
  const { point } = frameOf(first.start, turn)
  const lines = spans.map((span) => ({ ...point(span.start), length: span.length, top: span.top, bottom: span.bottom }))
  const ordered = lines.every((line, index) => index === 0 || line.v - lines[index - 1].v > first.size * 0.5)
  return ordered ? { origin: first.start, turn, size: first.size, lines } : null
}

/**
 * Chữ gốc của khối trong nội dung trang. `null` = không viết lại được chỗ này:
 * chữ nằm trong form XObject (không có ở cấp trang), hoặc một đối tượng chữ
 * chạy dài quá khối — gỡ nó là mất luôn chữ ngoài vùng đang sửa.
 */
function blockObjects(objects: PageObject[], block: Pick<ReflowBlock, 'origin' | 'turn' | 'size' | 'lines'>): number[] | null {
  const { band } = frameOf(block.origin, block.turn)
  const { lines, size } = block
  const slack = size * 0.1
  const covered = lines.map(() => ({ from: Infinity, to: -Infinity }))
  const matched: number[] = []

  for (const [index, object] of objects.entries()) {
    if (object.kind !== 'text') continue
    const b = band(object.box)
    const u = (b.u0 + b.u1) / 2
    const v = (b.v0 + b.v1) / 2
    const at = lines.findIndex(
      (line) => v >= line.v + line.top - slack && v <= line.v + line.bottom + slack && u >= line.u - slack && u <= line.u + line.length + slack,
    )
    if (at < 0) continue
    const line = lines[at]
    if (b.u0 < line.u - size || b.u1 > line.u + line.length + size) return null
    matched.push(index)
    covered[at] = { from: Math.min(covered[at].from, b.u0), to: Math.max(covered[at].to, b.u1) }
  }

  return lines.every((line, index) => covered[index].to - covered[index].from >= line.length * 0.6) ? matched : null
}

/** Khúc chữ `span` có phải chính một dòng của khối không. */
function isOwnLine(at: { u: number; v: number }, length: number, lines: BlockLine[], size: number): boolean {
  return lines.some((line) => Math.abs(at.v - line.v) < size * 0.3 && at.u < line.u + line.length && at.u + length > line.u)
}

function linePitch(block: Pick<ReflowBlock, 'origin' | 'turn' | 'size' | 'lines'>, neighbours: LineSpan[], objects: PageObject[]): number {
  const { lines, size } = block
  if (lines.length > 1) return (lastBaseline(lines) - lines[0].v) / (lines.length - 1)
  const { point, band } = frameOf(block.origin, block.turn)
  const [line] = lines
  // Nét kẻ ngang nằm giữa hai dòng = hai hàng của một bảng: khoảng cách ấy là cao hàng, không phải giãn dòng.
  const rules = objects
    .filter((object) => object.kind === 'path')
    .map((object) => band(object.box))
    .filter((b) => b.v1 - b.v0 <= RULE_WIDTH && b.u0 < line.u + line.length && b.u1 > line.u)
  let nearest = Infinity
  for (const span of neighbours) {
    if (span.angle !== block.turn || span.size < size * 0.8 || span.size > size * 1.25) continue
    const at = point(span.start)
    if (at.u >= line.u + line.length || at.u + span.length <= line.u) continue
    const gap = Math.abs(at.v - line.v)
    if (gap < size * MIN_PITCH || gap > size * MAX_PITCH) continue
    const [above, below] = at.v < line.v ? [at.v, line.v] : [line.v, at.v]
    if (!rules.some((rule) => rule.v0 > above && rule.v1 < below)) nearest = Math.min(nearest, gap)
  }
  return Number.isFinite(nearest) ? nearest : size * DEFAULT_PITCH
}

/**
 * Chữ mới được chạy tới đâu thì phải xuống dòng: mép phải của cột (dòng dài
 * nhất nằm cùng cột trên trang), nhưng dừng trước chữ ô bên cạnh và nét kẻ dọc
 * của bảng nằm ngang hàng với khối. Không bao giờ hẹp hơn chính chữ gốc.
 */
function wrapEdge(block: Pick<ReflowBlock, 'origin' | 'turn' | 'size' | 'lines'>, neighbours: LineSpan[], objects: PageObject[]): number {
  const { lines, size } = block
  const { point, band } = frameOf(block.origin, block.turn)
  const own = Math.max(...lines.map((line) => line.u + line.length))
  const left = Math.min(...lines.map((line) => line.u))
  const top = Math.min(...lines.map((line) => line.v + line.top))
  const bottom = Math.max(...lines.map((line) => line.v + line.bottom))
  let column = own
  let limit = Infinity

  for (const span of neighbours) {
    if (span.angle !== block.turn) continue
    const at = point(span.start)
    if (isOwnLine(at, span.length, lines, size)) continue
    if (at.v + span.top < bottom && at.v + span.bottom > top) {
      if (at.u >= own - size * 0.5) limit = Math.min(limit, at.u - size * 0.5)
    } else if (at.u < own && at.u + span.length > left) {
      column = Math.max(column, at.u + span.length)
    }
  }

  for (const object of objects) {
    if (object.kind !== 'path') continue
    const b = band(object.box)
    const crosses = b.v0 < bottom && b.v1 > top && b.v1 - b.v0 >= size * 0.8
    if (crosses && b.u1 - b.u0 <= RULE_WIDTH && b.u0 >= own - size * 0.5) limit = Math.min(limit, b.u0 - size * 0.3)
  }

  return Math.max(own, Math.min(column, limit))
}

/** Thân bài, chân trang và cột bên cạnh, nhìn từ khối chữ. Chữ dọc không xét chân trang / cột: "đáy trang" của nó là mép bên của trang. */
function blockZones(block: Pick<ReflowBlock, 'origin' | 'turn' | 'size' | 'lines'>, pitch: number, objects: PageObject[], page: Size): ReflowZones {
  const { point, band } = frameOf(block.origin, block.turn)
  const { lines, size } = block
  const items: ZoneItem[] = objects.map((object) => ({ ...band(object.box), text: object.kind === 'text', base: object.anchor && point(object.anchor).v }))
  const sheet = band({ x: 0, y: 0, width: page.width, height: page.height })
  if (block.turn !== 0) return { footer: null, columns: null, ...bodyBounds(items, sheet, null, pitch) }
  const last = lastBaseline(lines)
  const below = footerTop(items, sheet, pitch)
  // Đang sửa chính chân trang thì nó là thân bài của lần sửa này.
  const footer = below !== null && last < below ? below : null
  const own = { left: Math.min(...lines.map((line) => line.u)), right: Math.max(...lines.map((line) => line.u + line.length)), top: lines[0].v + lines[0].top, last, size }
  return { footer, columns: sideColumns(items, own, sheet, footer ?? sheet.v1), ...bodyBounds(items, sheet, footer, pitch) }
}

/**
 * Lên kế hoạch viết lại cho các dòng đã chọn. `neighbours` = mọi khúc chữ của
 * trang, `objects` = nội dung trang do PDFium liệt kê, `page` = khổ trang ở
 * khung gốc. `null` = chỗ này chỉ sửa được trên bề mặt.
 */
export function planReflow(spans: LineSpan[], neighbours: LineSpan[], objects: PageObject[], page: Size): ReflowPlan | null {
  const geometry = blockGeometry(spans)
  if (!geometry) return null
  const remove = blockObjects(objects, geometry)
  if (!remove) return null
  const { lines } = geometry
  const pitch = linePitch(geometry, neighbours, objects)
  const zones = blockZones(geometry, pitch, objects, page)
  const edge = wrapEdge(geometry, neighbours, objects)
  // Hàng bên kia khe cột trống đúng chỗ này thì `wrapEdge` không thấy gì chặn, chạy tới hết tiêu đề trải hai cột.
  const reach = zones.columns?.reach ?? Infinity
  return {
    remove,
    zones,
    block: {
      ...geometry,
      left: lines.length > 1 ? Math.min(...lines.slice(1).map((line) => line.u)) : 0,
      right: Math.max(...lines.map((line) => line.u + line.length), Math.min(edge, reach)),
      pitch,
    },
  }
}

/** Ngắt dòng chữ mới trong khối: dòng đầu chạy từ `u` = 0, các dòng sau từ `left`. */
export function reflowLines(text: string, block: ReflowBlock, measure: (line: string) => number): string[] {
  return text ? wrapText(text, (line) => (line === 0 ? block.right : block.right - block.left), measure) : []
}

/** Đầu chân chữ của dòng mới thứ `index` (khung gốc). */
export function reflowLineStart(block: ReflowBlock, index: number): Point {
  const axes = turnAxes(block.turn)
  const u = index === 0 ? 0 : block.left
  const v = index * block.pitch
  return { x: block.origin.x + axes.x.x * u + axes.y.x * v, y: block.origin.y + axes.x.y * u + axes.y.y * v }
}

/** Độ dời `delta` dọc chiều xuống của khối, đổi ra vectơ ở khung gốc. */
export function blockShift(block: ReflowBlock, delta: number): Point {
  const { y } = turnAxes(block.turn)
  return { x: y.x * delta, y: y.y * delta }
}

/**
 * Khung (dấu tay, liên kết, ô form…) có nằm dưới khối không: mép trên của nó đã
 * qua chân chữ dòng cuối. Vật bắt đầu từ phía trên (nét kẻ dọc của bảng, nền
 * trang) đứng yên — dời nó là kéo lệch cả phần phía trên khối.
 */
export function isBelowBlock(box: Rect, block: ReflowBlock): boolean {
  return frameOf(block.origin, block.turn).band(box).v0 > lastBaseline(block.lines) + Math.min(2, block.size * 0.15)
}

/** Một vật nằm dưới khối đi theo phần nào: đứng yên (chân trang, cột khác), cùng cột với chỗ sửa, hay dưới vùng nhiều cột. */
function partOf(b: Band, zones: ReflowZones): 'still' | 'own' | 'tail' {
  if (zones.footer !== null && b.v0 >= zones.footer - 0.5) return 'still'
  if (!zones.columns) return 'own'
  const part = columnPart(b, zones.columns)
  return part === 'side' ? 'still' : part
}

/**
 * Như `partOf` cho khung đi kèm, xét theo TÂM khung: ô form, vùng bấm của liên kết cao hơn dòng chữ chúng đi kèm, mép
 * trên nhô khỏi vùng chân trang trong khi dòng chữ ấy thuộc chân trang — xét theo mép trên là ô bị đẩy đi còn nhãn ở lại.
 */
function riderPart(b: Band, zones: ReflowZones): 'still' | 'own' | 'tail' {
  return partOf({ ...b, v0: (b.v0 + b.v1) / 2 }, zones)
}

function tailShift(delta: number, columns: SideColumns | null): number {
  return columns ? Math.max(columns.own + delta, columns.other) - Math.max(columns.own, columns.other) : delta
}

/** Một khung đi kèm nội dung trang mà không nằm trong nội dung (ô form, liên kết, ghi chú, dấu tay). */
export interface Rider {
  box: Rect
  /** Các khung cùng khoá phải ở chung một trang — nút của một nhóm radio. */
  group?: string
}

function unionOf(boxes: Rect[]): Rect {
  const x = Math.min(...boxes.map((box) => box.x))
  const y = Math.min(...boxes.map((box) => box.y))
  return { x, y, width: Math.max(...boxes.map((box) => box.x + box.width)) - x, height: Math.max(...boxes.map((box) => box.y + box.height)) - y }
}

/**
 * Khung dùng để XÉT từng khung đi kèm (cùng thứ tự với `riders`): khung có nhóm thì thay bằng khung bao các khung cùng
 * nhóm bị dời, để chỗ cắt trang không rơi vào giữa nhóm. Khung của nhóm nằm ngang hay phía trên khối vẫn xét riêng —
 * gộp cả chúng thì sửa nhãn của lựa chọn thứ hai là các lựa chọn bên dưới không dời theo nhãn nữa.
 */
export function riderFrames(riders: Rider[], plan: ReflowPlan): Rect[] {
  const { band } = frameOf(plan.block.origin, plan.block.turn)
  const below = (box: Rect) => isBelowBlock(box, plan.block)
  const groups = new Map<string, Rect[]>()
  for (const { box, group } of riders) {
    if (group !== undefined && below(box) && riderPart(band(box), plan.zones) !== 'still') groups.set(group, [...(groups.get(group) ?? []), box])
  }
  return riders.map(({ box, group }) => {
    const moving = group === undefined || !below(box) ? undefined : groups.get(group)
    return moving ? unionOf(moving) : box
  })
}

export interface Placement {
  /** 0 = trang đang sửa, `n` = trang tràn thứ `n`. */
  page: number
  /** Độ dời dọc theo `v`. */
  by: number
}

/** Một khung bất kỳ trên trang (dấu tay, liên kết, ô form) sau lần viết lại này nằm ở trang nào, dời bao nhiêu. */
export function placeOf(box: Rect, plan: ReflowPlan, shift: Pick<ShiftPlan, 'delta' | 'tailDelta' | 'spill'>): Placement {
  if (!isBelowBlock(box, plan.block)) return { page: 0, by: 0 }
  const b = frameOf(plan.block.origin, plan.block.turn).band(box)
  const part = riderPart(b, plan.zones)
  if (part === 'still') return { page: 0, by: 0 }
  const by = part === 'tail' ? shift.tailDelta : shift.delta
  // Trang cũng xét theo tâm: mép trên nhô quá chỗ cắt thì nhãn sang trang mới còn ô ở lại.
  const page = pageOf((b.v0 + b.v1) / 2 + by, shift.spill)
  return { page, by: by + (page ? shift.spill[page - 1].lift : 0) }
}

/** Chỗ của từng khung đi kèm sau lần viết lại này (cùng thứ tự với `riders`); khung cùng nhóm sang trang cùng nhau. */
export function placeRiders(riders: Rider[], plan: ReflowPlan, shift: Pick<ShiftPlan, 'delta' | 'tailDelta' | 'spill'>): Placement[] {
  const frames = riderFrames(riders, plan)
  return riders.map(({ box }, at) => {
    const own = placeOf(box, plan, shift)
    const group = placeOf(frames[at], plan, shift)
    // Nút vốn đứng yên (nằm trong vùng chân trang) chỉ rời chỗ khi cả nhóm sang trang khác.
    return own.by === 0 && group.page === own.page ? own : group
  })
}

/** Một mảnh của trang sau khi dời: dòng chữ mới hoặc một đối tượng bị đẩy. */
interface Piece {
  top: number
  bottom: number
  /** Chân chữ — chữ xét vừa trang theo chân chữ, không theo khung bao. */
  base?: number
}

const MAX_SPILL = 40
const pageOf = (top: number, spill: Pick<SpillPage, 'from'>[]) => spill.filter((sheet) => sheet.from <= top + 0.5).length

/**
 * Chỗ cắt trang cho phần tràn: cắt ở mép trên của mảnh đầu tiên không còn vừa,
 * mọi thứ từ đó trở xuống sang trang sau và được đặt lại từ lề trên. Mảnh nằm
 * ngay đầu trang mà vẫn không vừa (hình cao hơn cả trang) thì để nguyên ở đó —
 * không thì cắt mãi không hết.
 */
function spillCuts(pieces: Piece[], head: number, floor: number): number[] {
  const cuts: number[] = []
  let start = -Infinity
  let lift = 0
  while (cuts.length < MAX_SPILL) {
    const fresh = pieces.filter((piece) => piece.top > start + 0.5)
    const late = fresh.filter((piece) => (piece.base !== undefined ? piece.base + lift > floor + 0.01 : piece.bottom + lift > floor + 0.5))
    if (late.length === 0) break
    const cut = Math.min(...late.map((piece) => piece.top))
    // Chỗ cắt do một khung đi kèm gây ra có thể rơi giữa dòng chữ khung ấy nằm trên (liên kết thấp hơn dòng chữ của
    // nó): dòng bị cắt ở nửa trên thì đi cùng, không thì chữ ở lại còn vùng bấm sang trang.
    start = Math.min(cut, ...fresh.filter((piece) => piece.base !== undefined && piece.base - cut > (piece.base - piece.top) / 2).map((piece) => piece.top))
    lift = head - start
    cuts.push(start)
  }
  return cuts
}

interface Pushed extends Piece, Nudge {
  empty: boolean
}

/** Chia các dòng chữ mới và những vật bị đẩy xuống thành các trang tràn; `carried` chỉ góp vào việc chọn chỗ cắt. */
function spillPages(typed: Piece[], pushed: Pushed[], carried: Piece[], zones: BodyBounds): SpillPage[] {
  const cuts = spillCuts([...typed, ...pushed.filter((item) => !item.empty), ...carried], zones.head, zones.floor).map((from) => ({ from }))
  return cuts.map(({ from }, at) => {
    const here = (top: number) => pageOf(top, cuts) === at + 1
    const lift = zones.head - from
    const lines = typed.flatMap((item, index) => (here(item.top) ? [index] : []))
    return {
      from,
      lift,
      objects: pushed.filter((item) => here(item.top)).map((item) => ({ index: item.index, by: item.by + lift })),
      lines: lines.length > 0 ? [lines[0], lines[lines.length - 1] + 1] : [0, 0],
    }
  })
}

/**
 * Chữ mới có `lineCount` dòng thì phần dưới khối dời bao nhiêu và gồm những gì.
 * Chữ xét theo CHÂN CHỮ chứ không theo khung bao: khung bao chữ ôm sát nét, dòng
 * toàn chữ thường thấp hơn dòng có chữ hoa — xét theo mép trên là dòng giãn sát
 * bị bỏ lại. `riders` = khung của những thứ đi kèm nội dung mà không nằm trong
 * nội dung trang (ô form, liên kết, ghi chú, dấu tay).
 */
export function planShift(objects: PageObject[], plan: ReflowPlan, lineCount: number, page: Size, riders: Rect[] = []): ShiftPlan {
  const { block, zones } = plan
  const { point, band } = frameOf(block.origin, block.turn)
  const count = Math.max(1, lineCount)
  const delta = (count - block.lines.length) * block.pitch
  const tailDelta = tailShift(delta, zones.columns)
  const removed = new Set(plan.remove)
  const last = lastBaseline(block.lines)
  const move: number[] = []
  const tail: number[] = []
  for (const [index, object] of objects.entries()) {
    if (removed.has(index)) continue
    const below = object.kind === 'text' && object.anchor ? point(object.anchor).v > last + block.pitch * 0.25 : isBelowBlock(object.box, block)
    const part = below ? partOf(band(object.box), zones) : 'still'
    if (part === 'own') move.push(index)
    else if (part === 'tail') tail.push(index)
  }

  // Viền dọc và nền của hàng đang sửa bắt đầu từ phía trên khối nên đứng yên, trong khi viền hàng dưới đã dời đi —
  // không kéo dài thì bảng hở đúng một đoạn `delta`. Chỉ kéo thứ NỐI với phần bị dời: khung viền cả trang hay nền
  // trang cũng vắt qua khối nhưng không dính gì tới bảng.
  const moving = new Set(move)
  const joints = move.filter((index) => objects[index].kind !== 'text').map((index) => band(objects[index].box))
  const stretch = objects.flatMap((object, index): Nudge[] => {
    if (delta === 0 || object.kind !== 'path' || moving.has(index)) return []
    const b = band(object.box)
    if (b.v1 <= last + Math.min(2, block.size * 0.15) || b.v1 - b.v0 + delta < 1) return []
    if (object.stroked && b.u1 - b.u0 > RULE_WIDTH) return []
    if (!joints.some((joint) => Math.abs(joint.v0 - b.v1) <= JOIN && joint.u0 < b.u1 + JOIN && joint.u1 > b.u0 - JOIN)) return []
    // Hàng cao thêm quá mép dưới thân bài thì phần thừa của nó đã sang trang sau: viền chỉ dài tới mép ấy.
    const by = delta > 0 ? Math.min(delta, Math.max(0, zones.floor - b.v1)) : delta
    return by === 0 ? [] : [{ index, by }]
  })

  const edge = band({ x: 0, y: 0, width: page.width, height: page.height }).v1 + 0.5
  // Chỉ thứ bị đẩy XUỐNG mới tràn; vật vốn đã nằm ngoài trang (bị CropBox cắt) thì không.
  const pushed = [...(delta > 0 ? move.map((index) => ({ index, by: delta })) : []), ...(tailDelta > 0 ? tail.map((index) => ({ index, by: tailDelta })) : [])].flatMap(
    ({ index, by }): Pushed[] => {
      const { anchor, box } = objects[index]
      const b = band(box)
      // Chữ toàn dấu cách không có khung bao: nó đi theo trang của dòng chứa nó nhưng không tự gây ra chỗ cắt.
      const empty = b.v1 - b.v0 <= 0.01 && b.u1 - b.u0 <= 0.01
      return b.v1 <= edge ? [{ index, by, empty, top: b.v0 + by, bottom: b.v1 + by, base: anchor && point(anchor).v + by }] : []
    },
  )
  const [line] = block.lines
  const typed = Array.from({ length: count }, (_, at) => ({ top: at * block.pitch + line.top, bottom: at * block.pitch + line.bottom, base: at * block.pitch }))
  // Khung đi kèm cũng bị đẩy, thò quá lề dưới là phải cắt trang ở đó — không thì ô form rơi ra ngoài trang trong khi
  // chữ quanh nó vẫn vừa. Khung vốn đã quá lề từ trước (con dấu, chữ ký ở lề dưới) thì bỏ qua: tính nó là sửa một chữ
  // cũng tràn trang.
  const carried = riders.flatMap((box): Piece[] => {
    if (!isBelowBlock(box, block)) return []
    const b = band(box)
    const part = riderPart(b, zones)
    const by = part === 'own' ? delta : part === 'tail' ? tailDelta : 0
    return by > 0 && b.v1 <= zones.floor + 0.5 ? [{ top: b.v0 + by, bottom: b.v1 + by }] : []
  })
  const spill = delta > 0 ? spillPages(typed, pushed, carried, zones) : []
  const gone = new Set(spill.flatMap((sheet) => sheet.objects.map((item) => item.index)))
  const stays = (index: number) => !gone.has(index)
  return {
    delta,
    move: move.filter(stays),
    tailDelta,
    tail: tailDelta === 0 ? [] : tail.filter(stays),
    stretch,
    keep: typed.filter((item) => pageOf(item.top, spill) === 0).length,
    spill,
  }
}
