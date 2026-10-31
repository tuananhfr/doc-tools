import type { Quad } from '../types/text-layer.types'
import { perspectiveMatrix } from './ocr-perspective'
import { transformPoint } from './ocr-transform'

/** Straighten a cell before recognition; an axis-aligned crop retains sloping rules. */
export function rectifyCellPixels(rgba: Uint8ClampedArray, sourceWidth: number, sourceHeight: number, corners: Quad) {
  const distance = (a: number, b: number) => Math.hypot(corners[a].x - corners[b].x, corners[a].y - corners[b].y)
  const width = Math.max(2, Math.round(Math.max(distance(0, 1), distance(3, 2))))
  const height = Math.max(2, Math.round(Math.max(distance(0, 3), distance(1, 2))))
  const matrix = perspectiveMatrix([{ x: 0, y: 0 }, { x: width - 1, y: 0 }, { x: width - 1, y: height - 1 }, { x: 0, y: height - 1 }], corners)
  const data = new Uint8ClampedArray(width * height * 4)
  const sample = (x: number, y: number, channel: number) => x < 0 || y < 0 || x >= sourceWidth || y >= sourceHeight ? 255 : rgba[(y * sourceWidth + x) * 4 + channel]
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = transformPoint(matrix, { x, y }), sx = Math.floor(p.x), sy = Math.floor(p.y), fx = p.x - sx, fy = p.y - sy, offset = (y * width + x) * 4
    for (let c = 0; c < 3; c++) data[offset + c] = (sample(sx, sy, c) * (1 - fx) + sample(sx + 1, sy, c) * fx) * (1 - fy)
      + (sample(sx, sy + 1, c) * (1 - fx) + sample(sx + 1, sy + 1, c) * fx) * fy
    data[offset + 3] = 255
  }
  return { data, width, height }
}

/** Suppress only long edge rules. Short glyphs near a boundary must stay intact. */
export function clearCellRules(rgba: Uint8ClampedArray, width: number, height: number) {
  const output = new Uint8ClampedArray(rgba), horizontal: number[] = [], vertical: number[] = []
  const edge = 6, dark = (x: number, y: number) => rgba[(y * width + x) * 4] < 160
  for (let y = 0; y < height; y++) {
    if (y >= edge && y < height - edge) continue
    let ink = 0
    for (let x = 0; x < width; x++) if (dark(x, y)) ink++
    if (ink >= width * .6) horizontal.push(y)
  }
  for (let x = 0; x < width; x++) {
    if (x >= edge && x < width - edge) continue
    let ink = 0
    for (let y = 0; y < height; y++) if (dark(x, y)) ink++
    if (ink >= height * .6) vertical.push(x)
  }
  const erase = (x: number, y: number) => { const i = (y * width + x) * 4; output[i] = output[i + 1] = output[i + 2] = 255 }
  for (const y of horizontal) for (let dy = -1; dy <= 1; dy++) if (y + dy >= 0 && y + dy < height) for (let x = 0; x < width; x++) erase(x, y + dy)
  for (const x of vertical) for (let dx = -1; dx <= 1; dx++) if (x + dx >= 0 && x + dx < width) for (let y = 0; y < height; y++) erase(x + dx, y)
  return output
}

/** Locate separate ink rows, retaining detached accents within a small gap.
 * Long rules cannot become a text row. Crop padding is added by the reader.
 */
export function cellInkRows(rgba: Uint8ClampedArray, width: number, height: number) {
  const rows: { top: number; bottom: number }[] = []
  let top = -1, last = -1
  for (let y = 4; y < height - 4; y++) {
    let count = 0
    for (let x = 4; x < width - 4; x++) if (rgba[(y * width + x) * 4] < 140) count++
    if (count >= 2 && count < width * .65) { if (top < 0) top = y; last = y }
    if (top >= 0 && (y - last > 3 || y === height - 5)) {
      if (last - top >= 4) rows.push({ top: Math.max(0, top - 3), bottom: Math.min(height, last + 4) })
      top = -1
    }
  }
  return rows
}
