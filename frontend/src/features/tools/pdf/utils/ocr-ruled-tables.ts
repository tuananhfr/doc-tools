import type { GrayImage } from './scan-analysis'
import type { OcrWordResult } from '../types/ocr-result.types'
import type { Point } from './page-geometry'
import { tableFromGrid } from './ocr-table-grid'
import type { OcrTable } from '../types/ocr-layout.types'
import { detectSlantedTables } from './ocr-slanted-tables'

interface Segment { fixed: number; start: number; end: number; vertical: boolean }

/** Local connected grids: separate tables must not acquire rows from one another. */
export function detectRuledTables(image: GrayImage, words: OcrWordResult[], toBase: (p: Point) => Point) {
  const { width, height, data } = image, segments: Segment[] = []
  for (const vertical of [false, true]) {
    const across = vertical ? height : width, along = vertical ? width : height
    const minimum = vertical ? Math.max(20, height * .035) : Math.max(30, width * .15)
    for (let fixed = 0; fixed < along; fixed++) {
      let start = -1, last = -1
      for (let position = 0; position <= across + 2; position++) {
        const ink = position < across && data[vertical ? position * width + fixed : fixed * width + position] < 130
        if (ink) { if (start < 0) start = position; last = position }
        else if (start >= 0 && position - last > 2) {
          if (last - start >= minimum) segments.push({ fixed, start, end: last, vertical })
          start = -1
        }
      }
    }
  }
  if (segments.length > 3000) return detectSlantedTables(image, words, toBase)
  const parents = segments.map((_, i) => i)
  const root = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i] }; return i }
  for (let i = 0; i < segments.length; i++) for (let j = i + 1; j < segments.length; j++) {
    const a = segments[i], b = segments[j]
    const connected = a.vertical === b.vertical
      ? Math.abs(a.fixed - b.fixed) <= 2 && Math.max(a.start, b.start) <= Math.min(a.end, b.end) + 2
      : (() => { const v = a.vertical ? a : b, h = a.vertical ? b : a; return v.fixed >= h.start - 2 && v.fixed <= h.end + 2 && h.fixed >= v.start - 2 && h.fixed <= v.end + 2 })()
    if (connected) parents[root(j)] = root(i)
  }
  const groups = new Map<number, Segment[]>()
  segments.forEach((segment, i) => { const key = root(i); groups.set(key, [...groups.get(key) ?? [], segment]) })
  const tables: OcrTable[] = []
  for (const group of groups.values()) {
    const horizontal = group.filter(s => !s.vertical), vertical = group.filter(s => s.vertical)
    if (horizontal.length < 3 || vertical.length < 2) continue
    const left = Math.max(0, Math.floor(Math.min(...vertical.map(s => s.fixed), ...horizontal.map(s => s.start)) - 1))
    const right = Math.min(width - 1, Math.ceil(Math.max(...vertical.map(s => s.fixed), ...horizontal.map(s => s.end)) + 1))
    const top = Math.max(0, Math.floor(Math.min(...horizontal.map(s => s.fixed), ...vertical.map(s => s.start)) - 1))
    const bottom = Math.min(height - 1, Math.ceil(Math.max(...horizontal.map(s => s.fixed), ...vertical.map(s => s.end)) + 1))
    const w = right - left + 1, h = bottom - top + 1
    if (w < 35 || h < 20) continue
    const pixels = new Uint8Array(w * h)
    for (let y = 0; y < h; y++) pixels.set(data.subarray((y + top) * width + left, (y + top) * width + left + w), y * w)
    const localWords = words.map(word => ({ ...word, previewBox: { x: (word.previewBox.x * width - left) / w, y: (word.previewBox.y * height - top) / h, width: word.previewBox.width * width / w, height: word.previewBox.height * height / h } }))
    const table = tableFromGrid({ width: w, height: h, data: pixels }, localWords, p => toBase({ x: p.x + left, y: p.y + top }))
    if (!table || table.rows < 2 || table.columns < 2) continue
    const id = `table-${tables.length}`
    tables.push({ ...table, id, cells: table.cells.map(cell => ({ ...cell, id: `${id}:${cell.row}:${cell.column}` })) })
  }
  const recovered = detectSlantedTables(image, words, toBase)
  if (!recovered.length) return tables
  const bounds = (table: OcrTable) => {
    const points = table.cells.flatMap(cell => cell.bbox)
    return { left: Math.min(...points.map(p => p.x)), right: Math.max(...points.map(p => p.x)), top: Math.min(...points.map(p => p.y)), bottom: Math.max(...points.map(p => p.y)) }
  }
  const additional = tables.filter(table => {
    const a = bounds(table), area = (a.right - a.left) * (a.bottom - a.top)
    return !recovered.some(other => {
      const b = bounds(other), overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      return overlap > area * .6
    })
  })
  return [...recovered, ...additional].map((table, index) => ({ ...table, id: `table-${index}`, cells: table.cells.map(cell => ({ ...cell, id: `table-${index}:${cell.row}:${cell.column}` })) }))
}
