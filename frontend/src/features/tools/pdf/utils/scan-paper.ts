import type { Quad } from '../types/text-layer.types'
import type { GrayImage } from './scan-analysis'
import type { Point } from './page-geometry'
import { detectPaperCorners } from './ocr-paper'
import { validPaperCorners } from './ocr-perspective'
import { detectPageEdges, hasPaperContinuation } from './scan-edges'

const cross = (a: Point, b: Point, c: Point) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)
const area = (points: Point[]) => Math.abs(points.reduce((sum, p, i) => { const q = points[(i + 1) % points.length]; return sum + p.x * q.y - p.y * q.x }, 0)) / 2

function hull(points: Point[]) {
  points.sort((a, b) => a.x - b.x || a.y - b.y)
  const half = (input: Point[]) => {
    const result: Point[] = []
    for (const p of input) {
      while (result.length > 1 && cross(result[result.length - 2], result[result.length - 1], p) <= 0) result.pop()
      result.push(p)
    }
    result.pop(); return result
  }
  return [...half(points), ...half([...points].reverse())]
}

/** Small sampled masks only. Reject curved/unsupported shapes rather than guess a crop. */
export function detectScanCorners(image: GrayImage): Quad | null {
  const existing = detectPaperCorners(image, true)
  if (existing && !hasPaperContinuation(image, existing.map(p => ({ x: p.x * image.width, y: p.y * image.height })) as Quad)) return existing
  const { width, height, data } = image, size = width * height
  if (width < 40 || height < 40 || size > 768 * 768) return null
  const queue = new Int32Array(size)
  let best: Quad | null = null, bestScore = 0
  for (const threshold of [220, 205, 190, 175, 160, 145]) {
    const visited = new Uint8Array(size)
    for (let seed = 0; seed < size; seed++) {
      if (visited[seed] || data[seed] < threshold) continue
      let head = 0, tail = 1, touches = false
      queue[0] = seed; visited[seed] = 1
      while (head < tail) {
        const index = queue[head++], x = index % width, y = Math.floor(index / width)
        if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) touches = true
        for (const next of [x ? index - 1 : -1, x < width - 1 ? index + 1 : -1, y ? index - width : -1, y < height - 1 ? index + width : -1]) {
          if (next >= 0 && !visited[next] && data[next] >= threshold) { visited[next] = 1; queue[tail++] = next }
        }
      }
      if (touches || tail < size * .2) continue
      const left = new Int32Array(height).fill(width), right = new Int32Array(height).fill(-1)
      for (let i = 0; i < tail; i++) {
        const x = queue[i] % width, y = Math.floor(queue[i] / width)
        left[y] = Math.min(left[y], x); right[y] = Math.max(right[y], x)
      }
      const boundary: Point[] = []
      for (let y = 0; y < height; y++) if (right[y] >= 0) boundary.push({ x: left[y], y }, { x: right[y], y })
      const polygon = hull(boundary), fullArea = area(polygon)
      while (polygon.length > 4) {
        let least = Infinity, remove = 0
        for (let i = 0; i < polygon.length; i++) {
          const loss = Math.abs(cross(polygon[(i + polygon.length - 1) % polygon.length], polygon[i], polygon[(i + 1) % polygon.length]))
          if (loss < least) { least = loss; remove = i }
        }
        polygon.splice(remove, 1)
      }
      if (polygon.length !== 4 || area(polygon) < fullArea * .92) continue
      const first = polygon.reduce((index, p, i) => p.x + p.y < polygon[index].x + polygon[index].y ? i : index, 0)
      const corners = [...polygon.slice(first), ...polygon.slice(0, first)] as Quad
      const paperArea = area(corners), fill = tail / paperArea
      if (!validPaperCorners(corners, width, height) || fill < .75 || fill > 1.08) continue
      if (hasPaperContinuation(image, corners)) continue
      const pixel = (x: number, y: number) => x < 0 || y < 0 || x >= width || y >= height ? 255 : data[Math.round(y) * width + Math.round(x)]
      let supported = true
      for (let edge = 0; edge < 4; edge++) {
        const a = corners[edge], b = corners[(edge + 1) % 4], length = Math.hypot(b.x - a.x, b.y - a.y)
        const step = Math.max(2, Math.min(width, height) * .015), nx = -(b.y - a.y) / length * step, ny = (b.x - a.x) / length * step
        let count = 0, contrast = 0
        for (let i = 1; i <= 11; i++) {
          const x = a.x + (b.x - a.x) * i / 12, y = a.y + (b.y - a.y) * i / 12
          const difference = pixel(x + nx, y + ny) - pixel(x - nx, y - ny)
          contrast += difference; if (difference >= 8) count++
        }
        if (count < 7 || contrast / 11 < 16) { supported = false; break }
      }
      if (!supported || paperArea * Math.min(1, fill) <= bestScore) continue
      const center = { x: corners.reduce((sum, p) => sum + p.x, 0) / 4, y: corners.reduce((sum, p) => sum + p.y, 0) / 4 }
      best = corners.map(p => ({ x: Math.max(0, Math.min(1, (center.x + (p.x - center.x) * 1.01) / width)), y: Math.max(0, Math.min(1, (center.y + (p.y - center.y) * 1.01) / height)) })) as Quad
      bestScore = paperArea * Math.min(1, fill)
    }
  }
  // Book shadows can split a single page into incomplete brightness masks.
  // Fall back to supported boundary lines, rather than OCR the adjacent page too.
  return best ?? detectPageEdges(image)
}
