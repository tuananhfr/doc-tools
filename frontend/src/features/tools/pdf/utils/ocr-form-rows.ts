import { clearCellRules } from './ocr-cell-image'
import { localOcrPixels } from './ocr-local'
import { printedRuleSegments } from './ocr-slanted-tables'

/** Find printed rows without letting enclosing form rules join adjacent lines. */
export function formTextRows(raw: Uint8ClampedArray, width: number, height: number) {
  const pixels = clearCellRules(localOcrPixels(raw, width, height, .12), width, height)
  const scale = Math.min(1, 512 / width, 768 / height), sw = Math.ceil(width * scale), sh = Math.ceil(height * scale)
  const gray = new Uint8Array(sw * sh).fill(255)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const index = Math.min(sh - 1, Math.floor(y * scale)) * sw + Math.min(sw - 1, Math.floor(x * scale)), offset = (y * width + x) * 4
    gray[index] = Math.min(gray[index], Math.max(raw[offset], raw[offset + 1], raw[offset + 2]))
  }
  for (const line of printedRuleSegments({ width: sw, height: sh, data: gray })) {
    for (let p = Math.floor(line.start / scale); p <= Math.ceil(line.end / scale); p++) {
      const fixed = (line.offset + line.slope * p * scale) / scale
      for (let d = -Math.ceil(2 / scale); d <= Math.ceil(2 / scale); d++) {
        const x = line.vertical ? Math.round(fixed + d) : p, y = line.vertical ? p : Math.round(fixed + d)
        if (x >= 0 && x < width && y >= 0 && y < height) pixels[(y * width + x) * 4] = 255
      }
    }
  }
  for (let y = 0; y < height; y++) {
    let count = 0
    for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4] < 140) count++
    if (count < width * .65) continue
    for (let x = 0; x < width; x++) pixels[(y * width + x) * 4] = 255
  }
  for (let x = 0; x < width; x++) {
    let count = 0
    for (let y = 0; y < height; y++) if (pixels[(y * width + x) * 4] < 140) count++
    if (count < height * .65) continue
    for (let y = 0; y < height; y++) pixels[(y * width + x) * 4] = 255
  }
  const rows: { left: number; right: number; top: number; bottom: number }[] = []
  const edge = Math.min(20, Math.floor(width * .05))
  let top = -1, bottom = -1, left = width, right = 0
  for (let y = 2; y < height - 2; y++) {
    let count = 0, start = width, end = 0
    for (let x = edge; x < width - edge; x++) if (pixels[(y * width + x) * 4] < 140) { count++; start = Math.min(start, x); end = x }
    if (count >= 2) { if (top < 0) top = y; bottom = y; left = Math.min(left, start); right = Math.max(right, end) }
    if (top >= 0 && (y - bottom > 3 || y === height - 3)) {
      if (bottom - top >= 4 && right - left >= 3) rows.push({ top: Math.max(0, top - 3), bottom: Math.min(height, bottom + 4), left: 0, right: width })
      top = -1; left = width; right = 0
    }
  }
  const typical = Math.min(rows.map(row => row.bottom - row.top).sort((a, b) => a - b)[Math.floor(rows.length / 3)] ?? 20, Math.max(18, width * .03))
  const separate = (row: typeof rows[number], depth: number): typeof rows => {
    if (depth >= 3 || row.bottom - row.top <= typical * 1.6) return [row]
    const counts = Array.from({ length: row.right - row.left }, (_, i) => {
      let count = 0
      for (let y = row.top; y < row.bottom; y++) if (pixels[(y * width + row.left + i) * 4] < 140) count++
      return count
    })
    let start = -1, bestStart = 0, bestEnd = 0
    for (let i = 0; i <= counts.length; i++) {
      if (i < counts.length && counts[i] <= 1) { if (start < 0) start = i }
      else if (start >= 0) {
        if (start > counts.length * .1 && i < counts.length * .9 && i - start > bestEnd - bestStart) { bestStart = start; bestEnd = i }
        start = -1
      }
    }
    if (bestEnd - bestStart < Math.max(12, width * .025)) return [row]
    const cut = row.left + Math.floor((bestStart + bestEnd) / 2), result: typeof rows = []
    for (const [l, r] of [[row.left, cut], [cut, row.right]]) {
      let top = -1, last = -1
      for (let y = row.top; y <= row.bottom; y++) {
        let ink = 0
        if (y < row.bottom) for (let x = Math.max(edge, l); x < Math.min(width - edge, r); x++) if (pixels[(y * width + x) * 4] < 140) ink++
        if (ink >= 2) { if (top < 0) top = y; last = y }
        if (top >= 0 && (y - last > 3 || y === row.bottom)) {
          if (last - top >= 4) result.push(...separate({ left: l, right: r, top: Math.max(row.top, top - 3), bottom: Math.min(row.bottom, last + 4) }, depth + 1))
          top = -1
        }
      }
    }
    return result.length ? result : [row]
  }
  return rows.flatMap(row => separate(row, 0)).sort((a, b) => a.top - b.top || a.left - b.left)
}
