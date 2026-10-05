import type { TextRun } from '../types/text-layer.types'
import type { Point, QuarterTurn, Size } from './page-geometry'

/**
 * Dựng lại dòng / đoạn / cột từ mảnh chữ pdf.js — nền cho PDF → Word/Excel.
 * PDF không lưu "đoạn" hay "ô", chỉ lưu chữ ở toạ độ nào, nên mọi thứ ở đây
 * là đoán theo hình học: đủ cho văn bản hành chính, bảng kê đơn giản; bố cục
 * nhiều cột báo chí hay bảng gộp ô sẽ lệch.
 */

/** Lệch quá chừng này (độ) coi là chữ xoay — không xếp vào dòng ngang. */
const HORIZONTAL_TOLERANCE = 1.5
/** Hai mảnh cách nhau ≥ chừng này (theo cỡ chữ) là sang ô / cột khác, không còn là dấu cách. */
export const CELL_GAP = 1.2
/** Cách nhau ≥ chừng này (theo cỡ chữ) mới chèn dấu cách — pdf.js cắt mảnh giữa chừng một từ. */
const WORD_GAP = 0.15

export interface LayoutSegment {
  text: string
  x: number
  right: number
  size: number
  /** Tên font pdf.js nội bộ của mảnh đầu — tra kiểu đậm / nghiêng. */
  fontName: string
  fontFamily: string
}

export interface LayoutLine {
  baseline: number
  x: number
  right: number
  size: number
  segments: LayoutSegment[]
}

export interface PageLayout {
  lines: LayoutLine[]
  /** Chữ lệch hướng đọc chính (con dấu, chú thích dọc lề) — không xếp được vào dòng, giữ lại để khỏi mất chữ. */
  rotated: string[]
  /** Hướng chữ chiếm đa số ở khung gốc — dòng, toạ độ trên đã xoay về hướng đọc. */
  turn: QuarterTurn
  /** Khổ trang theo hướng đọc (chỉ có khi truyền khổ vào). */
  size?: Size
}

/** Hướng (bội 90°) của mảnh chữ, `null` nếu nghiêng lệch — chữ nghiêng không xếp được vào dòng. */
function quarterOf(run: TextRun): QuarterTurn | null {
  const angle = ((run.angle % 360) + 360) % 360
  const nearest = Math.round(angle / 90) * 90
  return Math.abs(angle - nearest) <= HORIZONTAL_TOLERANCE ? ((nearest % 360) as QuarterTurn) : null
}

/**
 * Hướng đọc = hướng có nhiều chữ nhất. Bản scan nằm ngang người dùng đã xoay
 * cho dễ đọc: OCR ra chữ đứng dọc ở khung gốc — chỉ nhận chữ ngang là mất
 * trắng cả trang, còn ghép bừa thì các từ dính liền nhau.
 */
function readingTurn(runs: TextRun[]): QuarterTurn {
  const weight = new Map<QuarterTurn, number>()
  for (const run of runs) {
    const quarter = quarterOf(run)
    if (quarter !== null) weight.set(quarter, (weight.get(quarter) ?? 0) + run.text.length)
  }
  let best: QuarterTurn = 0
  for (const [quarter, count] of weight) if (count > (weight.get(best) ?? 0)) best = quarter
  return best
}

const TURN_AXES: Record<QuarterTurn, [number, number]> = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }

/** Xoay điểm khung gốc (y hướng xuống) để chữ hướng `turn` thành chữ ngang. */
function toReading(point: Point, turn: QuarterTurn): Point {
  const [cos, sin] = TURN_AXES[turn]
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos }
}

const SPACE = /\s/

function buildSegments(runs: TextRun[]): LayoutSegment[] {
  const segments: LayoutSegment[] = []
  let current: LayoutSegment | null = null
  let spaced = false
  for (const run of runs) {
    // pdf.js chèn mảnh " " rộng phủ kín khoảng hở giữa hai cột — tính nó vào bề ngang là hai ô dính làm một.
    if (!run.text.trim()) {
      spaced = true
      continue
    }
    const gap = current ? run.origin.x - current.right : 0
    const size = Math.max(run.size, current?.size ?? 0)
    if (!current || gap >= size * CELL_GAP) {
      current = { text: run.text, x: run.origin.x, right: run.origin.x + run.width, size: run.size, fontName: run.fontName, fontFamily: run.fontFamily }
      segments.push(current)
      spaced = false
      continue
    }
    const joined = !spaced && (SPACE.test(current.text.slice(-1)) || SPACE.test(run.text.charAt(0)) || gap < size * WORD_GAP)
    current.text += joined ? run.text : ` ${run.text}`
    current.right = Math.max(current.right, run.origin.x + run.width)
    current.size = size
    spaced = false
  }
  return segments
    .map((segment) => ({ ...segment, text: segment.text.replace(/\s+/g, ' ').trim() }))
    .filter((segment) => segment.text.length > 0)
}

/** Gom mảnh chữ ngang thành dòng (trên xuống), mỗi dòng tách ô theo khoảng hở lớn. */
export function layoutPage(runs: TextRun[], size?: Size): PageLayout {
  const turn = readingTurn(runs)
  // Tịnh tiến để góc trang sau khi xoay về lại 0,0 — lề trang Word tính từ đó.
  const corners = size ? [toReading({ x: 0, y: 0 }, turn), toReading({ x: size.width, y: size.height }, turn)] : [{ x: 0, y: 0 }]
  const shift = { x: Math.min(...corners.map((point) => point.x)), y: Math.min(...corners.map((point) => point.y)) }
  const horizontal = runs
    .filter((run) => quarterOf(run) === turn)
    .map((run) => {
      const point = toReading(run.origin, turn)
      return { ...run, origin: { x: point.x - shift.x, y: point.y - shift.y }, angle: 0 }
    })
    .sort((a, b) => a.origin.y - b.origin.y || a.origin.x - b.origin.x)
  const groups: TextRun[][] = []
  for (const run of horizontal) {
    const group = groups[groups.length - 1]
    const anchor = group?.[0]
    if (group && Math.abs(run.origin.y - anchor.origin.y) < Math.max(run.size, anchor.size) * 0.3) group.push(run)
    else groups.push([run])
  }

  const lines: LayoutLine[] = []
  for (const group of groups) {
    const segments = buildSegments([...group].sort((a, b) => a.origin.x - b.origin.x))
    if (segments.length === 0) continue
    lines.push({
      baseline: group[0].origin.y,
      x: segments[0].x,
      right: segments[segments.length - 1].right,
      size: Math.max(...segments.map((segment) => segment.size)),
      segments,
    })
  }

  const rotated: string[] = []
  let pending: string[] = []
  const flush = () => {
    const text = pending.join(' ').replace(/\s+/g, ' ').trim()
    if (text) rotated.push(text)
    pending = []
  }
  for (const run of runs) {
    if (quarterOf(run) === turn) continue
    pending.push(run.text)
    if (run.eol) flush()
  }
  flush()

  const readingSize = size && turn % 180 !== 0 ? { width: size.height, height: size.width } : size
  return { lines, rotated, turn, size: readingSize }
}

export type ParagraphAlign = 'left' | 'center'

export interface LayoutParagraph {
  lines: LayoutLine[]
  align: ParagraphAlign
  /** Khoảng trống phía trên, ngoài khoảng dòng bình thường (pt). */
  spaceBefore: number
  /** Dòng có nhiều ô (bảng kê, "Bên A ....... Bên B") — giữ nguyên hàng, căn ô bằng tab. */
  tabular: boolean
}

/** Khoảng dòng bình thường so với cỡ chữ. */
const LINE_HEIGHT = 1.2

function isCentered(line: LayoutLine, left: number, right: number): boolean {
  const width = right - left
  const middle = (line.x + line.right) / 2
  return line.x > left + width * 0.1 && Math.abs(middle - (left + right) / 2) < width * 0.03
}

/**
 * Nối các dòng thành đoạn: dòng trước chạy gần tới mép phải (chữ tự xuống
 * dòng), cùng cỡ chữ, sát nhau, dòng sau không thụt vào hơn dòng đầu. Không
 * thoả là đoạn mới — ngắt nhầm còn đỡ hơn nối nhầm hai mục vào một đoạn.
 */
export function buildParagraphs(lines: LayoutLine[]): LayoutParagraph[] {
  if (lines.length === 0) return []
  const left = Math.min(...lines.map((line) => line.x))
  const right = Math.max(...lines.map((line) => line.right))
  const width = right - left

  const paragraphs: LayoutParagraph[] = []
  let previous: LayoutLine | null = null
  for (const line of lines) {
    const tabular = line.segments.length > 1
    const current = paragraphs[paragraphs.length - 1]
    const continues =
      previous !== null &&
      current !== undefined &&
      !current.tabular &&
      !tabular &&
      current.align === 'left' &&
      Math.abs(line.size - previous.size) <= 0.5 &&
      line.baseline - previous.baseline <= previous.size * 1.6 &&
      previous.right >= left + width * 0.85 &&
      line.x <= current.lines[0].x + previous.size * 0.5

    if (continues) {
      current.lines.push(line)
    } else {
      const gap = previous ? line.baseline - previous.baseline - line.size * LINE_HEIGHT : 0
      const align: ParagraphAlign = !tabular && isCentered(line, left, right) ? 'center' : 'left'
      paragraphs.push({ lines: [line], align, spaceBefore: Math.max(0, gap), tabular })
    }
    previous = line
  }
  return paragraphs
}

export interface TableLayout {
  /** Mép trái / phải từng cột (pt). */
  columns: { x: number; right: number }[]
  rows: string[][]
  /** Ô → segment gốc, để lấy kiểu chữ. */
  cells: (LayoutSegment | null)[][]
}

/**
 * Chia cột theo phần chồng lấn chiều ngang của các ô ở dòng NHIỀU ô: số căn
 * phải có mép trái lệch nhau từng dòng nhưng luôn chồng lên nhau trong cột.
 * Dòng một ô (tiêu đề, đoạn văn) không dựng cột — trải ngang là nuốt cả bảng.
 */
export function buildTable(lines: LayoutLine[]): TableLayout {
  const spans = lines
    .filter((line) => line.segments.length > 1)
    .flatMap((line) => line.segments.map((segment) => ({ x: segment.x, right: segment.right })))
    .sort((a, b) => a.x - b.x)
  const columns: { x: number; right: number }[] = []
  for (const span of spans) {
    const last = columns[columns.length - 1]
    if (last && span.x <= last.right + 2) last.right = Math.max(last.right, span.right)
    else columns.push({ ...span })
  }
  if (columns.length === 0) columns.push({ x: 0, right: Number.POSITIVE_INFINITY })

  const columnOf = (segment: LayoutSegment): number => {
    let best = -1
    let bestOverlap = 0
    columns.forEach((column, index) => {
      const overlap = Math.min(column.right, segment.right) - Math.max(column.x, segment.x)
      if (overlap > bestOverlap) {
        best = index
        bestOverlap = overlap
      }
    })
    if (best >= 0) return best
    const before = columns.findLastIndex((column) => column.x <= segment.x)
    return Math.max(0, before)
  }

  const rows: string[][] = []
  const cells: (LayoutSegment | null)[][] = []
  for (const line of lines) {
    const row: string[] = Array.from({ length: columns.length }, () => '')
    const source: (LayoutSegment | null)[] = Array.from({ length: columns.length }, () => null)
    for (const segment of line.segments) {
      let index = columnOf(line.segments.length === 1 ? { ...segment, right: segment.x + 1 } : segment)
      // Dòng một ô tràn qua nhiều cột (tiêu đề căn giữa, đoạn văn) về cột đầu — để giữa bảng là lệch khỏi mọi cột.
      if (line.segments.length === 1 && segment.right > columns[index].right + 2) index = 0
      row[index] = row[index] ? `${row[index]} ${segment.text}` : segment.text
      source[index] ??= segment
    }
    rows.push(row)
    cells.push(source)
  }
  return { columns, rows, cells }
}

/** Mã có số 0 đầu ("0123") — cả cột là mã, kể cả ô trông như số ("1102"). */
const CODE = /^0\d+$/

/** Giá trị ô cho Excel: số thành số, trừ cột mã — nửa cột chữ nửa cột số là sắp xếp, lọc sai. */
export function tableValues(table: TableLayout): (string | number | null)[][] {
  const codeColumns = table.columns.map((_column, index) => table.rows.some((row) => CODE.test(row[index].trim())))
  return table.rows.map((row) => row.map((text, index) => (!text ? null : codeColumns[index] ? text : parseCellValue(text))))
}

const GROUPED = /^-?\d{1,3}(\.\d{3})+(,\d+)?$/
const DECIMAL = /^-?\d+,\d+$/
const INTEGER = /^-?(0|[1-9]\d{0,14})$/

/**
 * Số viết kiểu Việt ("1.234.567", "12,5") → số cho Excel tính được. Không
 * chắc là số thì để nguyên chữ: mã "0123", số hiệu "12/2026/HĐ" mà thành số
 * là mất số 0 đầu, mất ý nghĩa.
 */
export function parseCellValue(text: string): string | number {
  const value = text.trim()
  if (GROUPED.test(value)) return Number(value.replace(/\./g, '').replace(',', '.'))
  if (DECIMAL.test(value)) return Number(value.replace(',', '.'))
  if (INTEGER.test(value)) return Number(value)
  return text
}
