import type { GrayImage } from './scan-analysis'
import type { Point } from './page-geometry'
import type { OcrWordResult } from '../types/ocr-result.types'
import type { OcrTable } from '../types/ocr-layout.types'
import type { Quad } from '../types/text-layer.types'
import { perspectiveMatrix } from './ocr-perspective'
import { invertMatrix, transformPoint } from './ocr-transform'
import { tableFromGrid } from './ocr-table-grid'

interface Line { vertical: boolean; slope: number; offset: number; start: number; end: number }
const at = (line: Line, position: number) => line.offset + line.slope * position
const point = (line: Line, position: number): Point => line.vertical ? { x: at(line, position), y: position } : { x: position, y: at(line, position) }

/** Local contrast preserves faint rules on grey/shadowed paper without thresholding the OCR image. */
function rulingMask({ width, height, data }: GrayImage) {
  const stride = width + 1, sums = new Uint32Array(stride * (height + 1)), mask = new Uint8Array(data.length)
  for (let y = 0; y < height; y++) {
    let sum = 0
    for (let x = 0; x < width; x++) { sum += data[y * width + x]; sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + sum }
  }
  const radius = Math.max(8, Math.round(width / 48))
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const l = Math.max(0, x - radius), r = Math.min(width, x + radius + 1), t = Math.max(0, y - radius), b = Math.min(height, y + radius + 1)
    const mean = (sums[b * stride + r] - sums[t * stride + r] - sums[b * stride + l] + sums[t * stride + l]) / ((r - l) * (b - t))
    mask[y * width + x] = data[y * width + x] < mean - 4 ? 1 : 0
  }
  return mask
}

function segments(image: GrayImage, mask: Uint8Array, isolated = false) {
  const candidates: Line[] = [], { width, height } = image
  for (const vertical of [false, true]) {
    const along = vertical ? height : width, across = vertical ? width : height
    const minimum = Math.max(24, along * (vertical ? .05 : .12))
    const gap = isolated ? Math.max(4, Math.round(vertical ? height * .012 : width * .016)) : vertical ? 4 : Math.max(4, Math.round(width * .016))
    const samples = new Uint8Array(along)
    for (let angle = -20; angle <= 20; angle++) {
      const slope = angle / 200, padding = Math.ceil(Math.abs(slope) * along)
      for (let offset = -padding; offset < across + padding; offset++) {
        let start = -1, last = -1, ink = 0
        for (let position = 0; position <= along + gap; position++) {
          const fixed = Math.round(offset + slope * position)
          const index = vertical ? position * width + fixed : fixed * width + position
          const step = vertical ? 1 : width
          // Rules have paper on both sides. A broad dark photo border must not consume
          // the candidate budget with hundreds of intersecting diagonal strokes.
          const present = position < along && fixed >= 0 && fixed < across && mask[index]
            && (!isolated || fixed >= 4 && fixed < across - 4 && !mask[index - step * 4] && !mask[index + step * 4])
          if (position < along) samples[position] = present ? 1 : 0
          if (present) { if (start < 0) start = position; last = position; ink++ }
          else if (start >= 0 && position - last > gap) {
            if (last - start >= minimum) {
              if (ink / (last - start + 1) >= .8) candidates.push({ vertical, slope, offset, start, end: last })
              else {
                // Text touching a broken rule must not lower the density of the entire rule.
                const window = Math.ceil(minimum)
                let sum = 0, begin = -1, end = -1, bestStart = -1, bestEnd = -1
                for (let p = start; p <= last; p++) {
                  sum += samples[p]; if (p - window >= start) sum -= samples[p - window]
                  if (p - start + 1 >= window && sum / window >= .82) {
                    if (begin < 0) begin = p - window + 1
                    end = p
                    if (end - begin > bestEnd - bestStart) { bestStart = begin; bestEnd = end }
                  } else if (end >= 0 && p - end > gap) begin = -1
                }
                if (bestEnd - bestStart >= minimum) candidates.push({ vertical, slope, offset, start: bestStart, end: bestEnd })
              }
            }
            start = -1; ink = 0
          }
        }
      }
    }
  }
  // Longest-supported segments own their geometry; nearby slope samples must not create extra rows.
  candidates.sort((a, b) => b.end - b.start - (a.end - a.start))
  const result: Line[] = []
  for (const candidate of candidates) {
    const duplicate = result.find(line => {
      if (line.vertical !== candidate.vertical) return false
      const start = Math.max(line.start, candidate.start), end = Math.min(line.end, candidate.end)
      return end - start > Math.min(line.end - line.start, candidate.end - candidate.start) * .3 && Math.max(Math.abs(at(line, start) - at(candidate, start)), Math.abs(at(line, end) - at(candidate, end))) <= 3
    })
    // Keep the measured endpoints of the longest supported sample. Extending it
    // with overlapping samples of a different slope can invent a full-page line.
    if (duplicate && !isolated) { duplicate.start = Math.min(duplicate.start, candidate.start); duplicate.end = Math.max(duplicate.end, candidate.end) }
    else if (!duplicate && result.length < 160) result.push({ ...candidate })
  }
  if (!isolated) return result
  // Quantized slope samples can split one faint rule into adjacent pieces.
  // Fit their measured endpoints instead of extending one piece's slope.
  for (let i = 0; i < result.length; i++) for (let j = i + 1; j < result.length; j++) {
    const a = result[i], b = result[j]
    if (a.vertical !== b.vertical || Math.max(a.start, b.start) - Math.min(a.end, b.end) > 12) continue
    const start = Math.min(a.start, b.start), end = Math.max(a.end, b.end)
    const first = a.start < b.start ? a : b, last = a.end > b.end ? a : b
    const slope = (at(last, end) - at(first, start)) / (end - start), offset = at(first, start) - slope * start
    if ([a, b].some(line => [line.start, line.end].some(p => Math.abs(at(line, p) - offset - slope * p) > 2))) continue
    result[i] = { vertical: a.vertical, slope, offset, start, end }; result.splice(j--, 1)
  }
  return result
}

function intersection(a: Line, b: Line): Point {
  const v = a.vertical ? a : b, h = a.vertical ? b : a
  const x = (v.offset + v.slope * h.offset) / (1 - v.slope * h.slope)
  return { x, y: at(h, x) }
}

/** Shared geometric evidence for separating text rows on a photographed form. */
export function printedRuleSegments(image: GrayImage) {
  return segments(image, rulingMask(image), true)
}

function bands(values: number[], maximum: number) {
  const groups: number[][] = []
  for (const value of values.map(value => Math.max(0, Math.min(maximum, value))).sort((a, b) => a - b)) {
    const previous = groups.at(-1)
    if (previous && value - previous.at(-1)! < 4) previous.push(value)
    else groups.push([value])
  }
  return groups.map(group => group.reduce((a, b) => a + b, 0) / group.length)
}

/** Dense row/column intersections identify the data grid independently of a
 * connected page frame, letterhead rules and signature boxes. */
function denseGrids(lines: Line[]) {
  const crosses = (v: Line, h: Line) => {
    const p = intersection(v, h)
    return p.x >= h.start - 5 && p.x <= h.end + 5 && p.y >= v.start - 5 && p.y <= v.end + 5
  }
  const horizontal = lines.filter(line => !line.vertical), vertical = lines.filter(line => line.vertical)
  const columns = vertical.filter(v => horizontal.filter(h => crosses(v, h)).length >= 3)
  const rows = horizontal.filter(h => {
    const positions = columns.filter(v => crosses(v, h)).map(v => intersection(v, h).x).sort((a, b) => a - b)
    return positions.filter((x, index) => !index || x - positions[index - 1] > 4).length >= 4
  })
  const groups: Line[][] = []
  const pending = new Set(rows)
  while (pending.size) {
    const connected = [pending.values().next().value!]; pending.delete(connected[0])
    for (let i = 0; i < connected.length; i++) for (const row of pending) {
      if (columns.filter(v => crosses(v, connected[i]) && crosses(v, row)).length < 3) continue
      connected.push(row); pending.delete(row)
    }
    if (connected.length < 3) continue
    const edges = columns.filter(v => connected.filter(h => crosses(v, h)).length >= 3)
    const middle = edges.reduce((sum, v) => sum + at(v, (v.start + v.end) / 2), 0) / edges.length
    const top = Math.min(...connected.map(h => at(h, middle))), bottom = Math.max(...connected.map(h => at(h, middle)))
    // A split/merged header may cross fewer columns than the body rows.
    const innerRows = horizontal.filter(h => at(h, middle) >= top - 3 && at(h, middle) <= bottom + 3
      && edges.filter(v => crosses(v, h)).length >= 2)
    groups.push([...innerRows, ...edges])
  }
  return groups
}

/** Recover each connected ruled table in its own coordinate system; surrounding text is never warped. */
export function detectSlantedTables(image: GrayImage, words: OcrWordResult[], toBase: (p: Point) => Point): OcrTable[] {
  const mask = rulingMask(image), lines = segments(image, mask), parents = lines.map((_, i) => i), adjacent = lines.map(() => new Set<number>())
  const root = (i: number): number => { while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i] }; return i }
  for (let i = 0; i < lines.length; i++) for (let j = i + 1; j < lines.length; j++) {
    const a = lines[i], b = lines[j]
    if (a.vertical === b.vertical) continue
    const p = intersection(a, b), v = a.vertical ? a : b, h = a.vertical ? b : a
    if (p.x >= h.start - 5 && p.x <= h.end + 5 && p.y >= v.start - 5 && p.y <= v.end + 5) { adjacent[i].add(j); adjacent[j].add(i) }
  }
  // A page edge, signature or stray stroke attached at one end is not a table boundary.
  const active = new Set(lines.map((_, i) => i))
  let pruning = true
  while (pruning) {
    pruning = false
    for (const i of active) if ([...adjacent[i]].filter(j => active.has(j)).length < 2) { active.delete(i); pruning = true }
  }
  for (const i of active) for (const j of adjacent[i]) if (active.has(j)) parents[root(j)] = root(i)
  const groups = new Map<number, Line[]>()
  lines.forEach((line, i) => { if (!active.has(i)) return; const key = root(i); groups.set(key, [...groups.get(key) ?? [], line]) })
  const tables = recoverTables(image, mask, words, toBase, groups.values(), false)
  const isolated = recoverTables(image, mask, words, toBase, denseGrids(segments(image, mask, true)), true)
  const bounds = (table: OcrTable) => {
    const points = table.cells.flatMap(cell => cell.bbox)
    const left = Math.min(...points.map(p => p.x)), right = Math.max(...points.map(p => p.x))
    const top = Math.min(...points.map(p => p.y)), bottom = Math.max(...points.map(p => p.y))
    return { left, right, top, bottom, area: (right - left) * (bottom - top) }
  }
  for (const candidate of isolated) {
    const a = bounds(candidate)
    const index = tables.findIndex(table => {
      const b = bounds(table)
      const overlap = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top))
      return overlap > Math.min(a.area, b.area) * .6
    })
    if (index < 0) tables.push(candidate)
    else {
      const previous = tables[index], b = bounds(previous)
      // Keep complete merged headers; replace a truncated grid only when the
      // independent reading finds more columns in essentially the same region.
      if (candidate.columns > previous.columns && a.area >= b.area * .75 && a.area <= b.area * 1.5) tables[index] = candidate
    }
  }
  return tables.map((table, index) => ({ ...table, id: `table-${index}`, cells: table.cells.map(cell => ({ ...cell, id: `table-${index}:${cell.row}:${cell.column}` })) }))
}

function recoverTables(image: GrayImage, mask: Uint8Array, words: OcrWordResult[], toBase: (p: Point) => Point, groups: Iterable<Line[]>, pixelRules: boolean) {
  const tables: OcrTable[] = []
  for (const group of groups) {
    const horizontal = group.filter(line => !line.vertical).sort((a, b) => at(a, image.width / 2) - at(b, image.width / 2))
    const vertical = group.filter(line => line.vertical).sort((a, b) => at(a, image.height / 2) - at(b, image.height / 2))
    if (horizontal.length < 3 || vertical.length < 2) continue
    const corners: Quad = [intersection(horizontal[0], vertical[0]), intersection(horizontal[0], vertical.at(-1)!), intersection(horizontal.at(-1)!, vertical.at(-1)!), intersection(horizontal.at(-1)!, vertical[0])]
    if (corners.some(p => p.x < -5 || p.x > image.width + 5 || p.y < -5 || p.y > image.height + 5)) continue
    const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
    const width = Math.round((distance(corners[0], corners[1]) + distance(corners[2], corners[3])) / 2)
    const height = Math.round((distance(corners[0], corners[3]) + distance(corners[1], corners[2])) / 2)
    if (width < 40 || height < 25 || width > image.width * 1.2 || height > image.height * 1.2) continue
    const fromRect = perspectiveMatrix([{ x: 0, y: 0 }, { x: width - 1, y: 0 }, { x: width - 1, y: height - 1 }, { x: 0, y: height - 1 }], corners), toRect = invertMatrix(fromRect)
    const rows = bands(horizontal.map(line => transformPoint(toRect, point(line, (line.start + line.end) / 2)).y), height - 1)
    const columns = bands(vertical.map(line => transformPoint(toRect, point(line, (line.start + line.end) / 2)).x), width - 1)
    if (rows.length < 3 || columns.length < 2 || rows.length > 65 || columns.length > 17) continue
    const data = new Uint8Array(width * height).fill(255)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const p = transformPoint(fromRect, { x, y }), sx = Math.round(p.x), sy = Math.round(p.y)
      if (sx >= 0 && sx < image.width && sy >= 0 && sy < image.height && mask[sy * image.width + sx]) data[y * width + x] = 0
    }
    const localWords = words.map(word => {
      const box = word.previewBox, a = transformPoint(toRect, { x: (box.x + box.width / 2) * image.width, y: (box.y + box.height / 2) * image.height })
      return { ...word, previewBox: { x: a.x / width, y: a.y / height, width: 0, height: 0 } }
    })
    const supports = (vertical: boolean, fixed: number, start: number, end: number) => {
      if (pixelRules) {
        let count = 0, total = 0
        for (let p = Math.ceil(start + 2); p < end - 2; p++) {
          total++
          if ([-2, -1, 0, 1, 2].some(d => {
            const x = Math.round(vertical ? fixed + d : p), y = Math.round(vertical ? p : fixed + d)
            return x >= 0 && x < width && y >= 0 && y < height && data[y * width + x] === 0
          })) count++
        }
        return count / Math.max(1, total) > .45
      }
      return group.some(line => {
        if (line.vertical !== vertical) return false
        const a = transformPoint(toRect, point(line, line.start)), b = transformPoint(toRect, point(line, line.end))
        const position = vertical ? (a.x + b.x) / 2 : (a.y + b.y) / 2
        const from = vertical ? Math.min(a.y, b.y) : Math.min(a.x, b.x), to = vertical ? Math.max(a.y, b.y) : Math.max(a.x, b.x)
        return Math.abs(position - fixed) < 4 && Math.min(to + 2, end) - Math.max(from - 2, start) > (end - start) * .7
      })
    }
    const verticalRules = rows.slice(0, -1).map((y, row) => columns.slice(1, -1).map(x => supports(true, x, y, rows[row + 1])))
    const horizontalRules = rows.slice(1, -1).map(y => columns.slice(0, -1).map((x, column) => supports(false, y, x, columns[column + 1])))
    const table = tableFromGrid({ width, height, data }, localWords, p => toBase(transformPoint(fromRect, p)), { rows, columns, verticalRules, horizontalRules })
    if (!table || table.rows < 2 || table.columns < 2) continue
    // Prefer the isolated grid to the enclosing form/frame component.
    if (tables.some(previous => {
      const points = previous.cells.flatMap(cell => cell.bbox)
      const center = toBase(transformPoint(fromRect, { x: width / 2, y: height / 2 }))
      return center.x >= Math.min(...points.map(p => p.x)) && center.x <= Math.max(...points.map(p => p.x))
        && center.y >= Math.min(...points.map(p => p.y)) && center.y <= Math.max(...points.map(p => p.y))
    })) continue
    const id = `table-${tables.length}`
    tables.push({ ...table, id, cells: table.cells.map(cell => ({ ...cell, id: `${id}:${cell.row}:${cell.column}` })) })
  }
  return tables
}
