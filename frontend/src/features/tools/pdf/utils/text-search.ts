import type { PageText, Quad, TextRun } from '../types/text-layer.types'
import type { Caret } from './text-select'
import type { Point } from './page-geometry'

export interface SearchOptions {
  /** Không phân biệt dấu: "hop dong" khớp "hợp đồng". */
  ignoreAccents: boolean
  matchCase: boolean
}

/**
 * Chuỗi chữ của một trang ghép từ các mảnh, kèm bảng tra ngược từng ký tự về
 * mảnh + vị trí trong mảnh để từ kết quả tìm vẽ lại đúng chỗ. Ký tự ghép thêm
 * (khoảng trắng giữa hai mảnh) có `run = -1`.
 */
export interface PageTextIndex {
  text: string
  run: Int32Array
  offset: Int32Array
  runs: TextRun[]
}

/** Bề dài phần đầu `chars` ký tự của một mảnh — mặc định chia đều theo số ký tự. */
export type RunMeasure = (run: TextRun, chars: number) => number

export const proportionalMeasure: RunMeasure = (run, chars) => (run.text.length === 0 ? 0 : (run.width * chars) / run.text.length)

const rad = (degrees: number) => (degrees * Math.PI) / 180

function along(run: TextRun): Point {
  return { x: Math.cos(rad(run.angle)), y: -Math.sin(rad(run.angle)) }
}

function down(run: TextRun): Point {
  return { x: Math.sin(rad(run.angle)), y: Math.cos(rad(run.angle)) }
}

/** Hai mảnh liền nhau cùng dòng: cùng góc, mảnh sau nằm trên đường chân chữ của mảnh trước. */
export function sameLine(a: TextRun, b: TextRun): boolean {
  if (Math.abs(a.angle - b.angle) > 1) return false
  const n = down(a)
  const offLine = (b.origin.x - a.origin.x) * n.x + (b.origin.y - a.origin.y) * n.y
  return Math.abs(offLine) < Math.max(a.size, b.size) * 0.3
}

/** Khoảng hở dọc dòng từ cuối mảnh `a` tới đầu mảnh `b` (pt). */
export function gapBetween(a: TextRun, b: TextRun): number {
  const d = along(a)
  return (b.origin.x - a.origin.x) * d.x + (b.origin.y - a.origin.y) * d.y - a.width
}

const SPACE = /\s/

/**
 * pdf.js cắt chữ thành mảnh theo lệnh vẽ, không theo từ: hai mảnh sát nhau là
 * cùng một từ, cách nhau ≥ 0,15 cỡ chữ mới là có khoảng trắng — chèn bừa dấu
 * cách là "hợp đồng" bị tách thành "hợ p đồng", tìm không ra.
 */
export function buildPageIndex(page: PageText): PageTextIndex {
  const chars: string[] = []
  const runIndex: number[] = []
  const offsets: number[] = []
  const runs = page.runs

  runs.forEach((run, index) => {
    const previous = runs[index - 1]
    if (previous && chars.length > 0 && !SPACE.test(chars[chars.length - 1]) && run.text.length > 0 && !SPACE.test(run.text[0])) {
      const separate = previous.eol || !sameLine(previous, run) || gapBetween(previous, run) > Math.max(previous.size, run.size) * 0.15
      if (separate) {
        chars.push(' ')
        runIndex.push(-1)
        offsets.push(0)
      }
    }
    for (let offset = 0; offset < run.text.length; offset++) {
      chars.push(run.text[offset])
      runIndex.push(index)
      offsets.push(offset)
    }
  })

  return { text: chars.join(''), run: Int32Array.from(runIndex), offset: Int32Array.from(offsets), runs }
}

/**
 * Chuẩn hoá từng ký tự một-đổi-một để vị trí trong chuỗi đã chuẩn hoá vẫn trỏ
 * đúng ký tự gốc. Chữ tiếng Việt dựng sẵn (NFC) bỏ dấu ra đúng 1 chữ cái.
 */
function foldChar(char: string, options: SearchOptions): string {
  let value = char
  if (SPACE.test(value)) return ' '
  if (options.ignoreAccents) {
    value = value.normalize('NFD').replace(/\p{M}/gu, '')
    if (value === 'đ') value = 'd'
    else if (value === 'Đ') value = 'D'
  }
  if (!options.matchCase) value = value.toLowerCase()
  return value.length === 1 ? value : char
}

export function foldText(text: string, options: SearchOptions): string {
  let out = ''
  for (const char of text) {
    // Ký tự ngoài BMP (2 đơn vị UTF-16) giữ nguyên để độ dài không đổi.
    out += char.length === 1 ? foldChar(char, options) : char
  }
  return out
}

export function normalizeQuery(query: string, options: SearchOptions): string {
  return foldText(query.normalize('NFC').trim().replace(/\s+/g, ' '), options)
}

export interface TextMatch {
  start: number
  end: number
}

export function findInPage(index: PageTextIndex, query: string, options: SearchOptions): TextMatch[] {
  const needle = normalizeQuery(query, options)
  if (!needle) return []
  const haystack = foldText(index.text, options)
  const matches: TextMatch[] = []
  let from = 0
  for (;;) {
    const at = haystack.indexOf(needle, from)
    if (at < 0) break
    matches.push({ start: at, end: at + needle.length })
    from = at + needle.length
  }
  return matches
}

function runQuad(run: TextRun, from: number, to: number, measure: RunMeasure): Quad {
  const d = along(run)
  const n = down(run)
  const x0 = measure(run, from)
  const x1 = measure(run, to)
  const top = -run.ascent * run.size
  const bottom = run.descent * run.size
  const at = (x: number, y: number): Point => ({ x: run.origin.x + d.x * x + n.x * y, y: run.origin.y + d.y * x + n.y * y })
  return [at(x0, top), at(x1, top), at(x1, bottom), at(x0, bottom)]
}

/** Hai con trỏ ôm đoạn khớp (bỏ dấu cách chèn thêm ở hai đầu) — để chọn lại đúng đoạn đó như khi kéo chuột. */
export function matchCarets(index: PageTextIndex, match: TextMatch): [Caret, Caret] | null {
  let first = match.start
  let last = match.end - 1
  while (first <= last && index.run[first] < 0) first++
  while (last >= first && index.run[last] < 0) last--
  if (first > last) return null
  return [
    { run: index.run[first], offset: index.offset[first] },
    { run: index.run[last], offset: index.offset[last] + 1 },
  ]
}

/** Mỗi mảnh chữ mà đoạn khớp đi qua cho một tứ giác — đoạn vắt qua hai dòng ra hai tứ giác. */
export function matchQuads(index: PageTextIndex, match: TextMatch, measure: RunMeasure = proportionalMeasure): Quad[] {
  const quads: Quad[] = []
  let current = -1
  let from = 0
  let to = 0
  const flush = () => {
    if (current >= 0) quads.push(runQuad(index.runs[current], from, to, measure))
  }
  for (let i = match.start; i < match.end; i++) {
    const run = index.run[i]
    if (run < 0) continue
    if (run !== current) {
      flush()
      current = run
      from = index.offset[i]
    }
    to = index.offset[i] + 1
  }
  flush()
  return quads
}

export interface Snippet {
  before: string
  match: string
  after: string
}

/** Ngữ cảnh quanh đoạn khớp cho danh sách kết quả. */
export function matchSnippet(index: PageTextIndex, match: TextMatch, radius = 32): Snippet {
  const clean = (value: string) => value.replace(/\s+/g, ' ')
  const startAt = Math.max(0, match.start - radius)
  const endAt = Math.min(index.text.length, match.end + radius)
  return {
    before: (startAt > 0 ? '…' : '') + clean(index.text.slice(startAt, match.start)).trimStart(),
    match: clean(index.text.slice(match.start, match.end)),
    after: clean(index.text.slice(match.end, endAt)).trimEnd() + (endAt < index.text.length ? '…' : ''),
  }
}

/** Khung bao thẳng trục của một tứ giác — dùng cho dấu tô sáng/gạch chân lưu dạng khung. */
export function quadBounds(quad: Quad) {
  const xs = quad.map((point) => point.x)
  const ys = quad.map((point) => point.y)
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) }
}
