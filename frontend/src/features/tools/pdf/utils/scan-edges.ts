import type { Quad } from '../types/text-layer.types'
import type { GrayImage } from './scan-analysis'
import { validPaperCorners } from './ocr-perspective'

interface Line { a: number; b: number; r: number; strength: number }

/** Reject text baselines/rules mistaken for any paper edge inside a sheet.
 * Corners are in sampled pixels. Require sustained paper beyond the candidate,
 * rather than treating one dark text row as the outside of the document. */
export function hasPaperContinuation(image: GrayImage, corners: Quad): boolean {
  const { width, height, data } = image, step = Math.max(3, Math.min(width, height) * .02)
  const paperTone = (x: number, y: number) => {
    if (x < 4 || y < 4 || x >= width - 4 || y >= height - 4) return null
    const values: number[] = [], radius = Math.max(2, Math.round(Math.min(width, height) * .008))
    if (x < radius || y < radius || x >= width - radius || y >= height - radius) return null
    for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) values.push(data[Math.round(y + dy) * width + Math.round(x + dx)])
    // Estimate paper tone without letting a few printed strokes darken it.
    values.sort((a, b) => a - b)
    return values[Math.floor(values.length * .75)]
  }
  for (const edge of [0, 1, 2, 3]) {
    const a = corners[edge], b = corners[(edge + 1) % 4], length = Math.hypot(b.x - a.x, b.y - a.y)
    const nx = -(b.y - a.y) / length * step, ny = (b.x - a.x) / length * step
    let continuing = 0
    for (let i = 1; i <= 9; i++) {
      const t = .15 + i * .07, x = a.x + (b.x - a.x) * t, y = a.y + (b.y - a.y) * t
      // A gradual shadow is still paper. Look for an actual brightness step
      // along this profile, instead of comparing distant points across shading.
      // Compare the nearby paper on both sides. Requiring a long outside
      // profile misses dividers near the photo boundary and clips headers.
      const tones = [2, 1, 0, -1, -2].map(distance => paperTone(x + nx * distance, y + ny * distance))
      if (tones.every((tone, index) => tone !== null && tone >= 120 && (!index || tone >= tones[index - 1]! - 35))) continuing++
    }
    if (continuing >= 6) return true
  }
  return false
}

const intersect = (p: Line, q: Line) => {
  const determinant = p.a * q.b - p.b * q.a
  return Math.abs(determinant) < .1 ? null : { x: (p.r * q.b - p.b * q.r) / determinant, y: (p.a * q.r - p.r * q.a) / determinant }
}

/** Find a bounded page by four supported edges, including paper darkened by book shadows. */
export function detectPageEdges(image: GrayImage): Quad | null {
  const { width, height, data } = image
  if (width < 80 || height < 80 || width * height > 768 * 768) return null
  const diagonal = Math.ceil(Math.hypot(width, height)), stride = diagonal * 2 + 1, count = 51
  const normals = [0, 90].map(base => Array.from({ length: count }, (_, i) => {
    const angle = (base - 25 + i) * Math.PI / 180
    return { a: Math.cos(angle), b: Math.sin(angle) }
  }))
  const votes = Array.from({ length: 4 }, () => new Uint32Array(stride * count))
  for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) {
    const i = y * width + x
    const gx = data[i-width+1] + 2*data[i+1] + data[i+width+1] - data[i-width-1] - 2*data[i-1] - data[i+width-1]
    const gy = data[i+width-1] + 2*data[i+width] + data[i+width+1] - data[i-width-1] - 2*data[i-width] - data[i-width+1]
    const magnitude = Math.hypot(gx, gy)
    if (magnitude < 45) continue
    let angle = Math.atan2(gy, gx) * 180 / Math.PI
    if (angle > 155) angle -= 180
    if (angle < -25) angle += 180
    const family = angle >= 55 && angle <= 125 ? 1 : angle >= -25 && angle <= 25 ? 0 : -1
    if (family < 0) continue
    const center = Math.round(angle - (family ? 65 : -25)), weight = Math.min(64, Math.round(magnitude))
    const target = votes[family * 2 + Number((family ? gy : gx) < 0)]
    for (let n = Math.max(0, center - 7); n <= Math.min(count - 1, center + 7); n++) {
      const normal = normals[family][n], r = Math.round(x * normal.a + y * normal.b) + diagonal
      target[n * stride + r] += weight
    }
  }
  const peaks = votes.map((accumulator, group) => {
    const selected: Line[] = [], candidates: Line[] = [], family = Math.floor(group / 2)
    for (let n = 0; n < count; n++) for (let r = 1; r < stride - 1; r++) {
      const index = n * stride + r, strength = accumulator[index]
      if (strength < Math.min(width, height) * 6 || strength < accumulator[index-1] || strength < accumulator[index+1]) continue
      candidates.push({ ...normals[family][n], r: r - diagonal, strength })
    }
    candidates.sort((a, b) => b.strength - a.strength)
    for (const line of candidates) {
      const distance = line.r - width / 2 * line.a - height / 2 * line.b
      if (selected.some(other => Math.abs(other.a * line.b - other.b * line.a) < .04 && Math.abs(other.r - width / 2 * other.a - height / 2 * other.b - distance) < 8)) continue
      selected.push(line)
      if (selected.length === 10) break
    }
    return selected
  })
  const smooth = new Uint8Array(data.length)
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    let sum = 0
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) sum += data[(y+dy)*width+x+dx]
    smooth[y*width+x] = Math.round(sum / 9)
  }
  const pixel = (x: number, y: number) => {
    const px = Math.round(x), py = Math.round(y)
    return px < 1 || py < 1 || px >= width - 1 || py >= height - 1 ? 255 : smooth[py * width + px]
  }
  let best: Quad | null = null, bestScore = 0
  for (const left of peaks[0]) for (const right of peaks[1]) for (const top of peaks[2]) for (const bottom of peaks[3]) {
    const points = [intersect(top, left), intersect(top, right), intersect(bottom, right), intersect(bottom, left)]
    // Curved book edges can intersect just outside the photo. Limit extrapolation,
    // then test brightness support along the visible boundary before accepting it.
    if (points.some(p => !p || p.x < -width * .08 || p.y < -height * .08 || p.x > width * 1.08 || p.y > height * 1.08)) continue
    const corners = points.map(p => ({ x: Math.max(1, Math.min(width - 1, p!.x)), y: Math.max(1, Math.min(height - 1, p!.y)) })) as Quad
    if (!validPaperCorners(corners, width, height)) continue
    const area = Math.abs(corners.reduce((s, p, i) => s + p.x * corners[(i+1)%4].y - p.y * corners[(i+1)%4].x, 0)) / 2
    if (area < width * height * .3) continue
    let score = 0, supported = true, partial = 0
    const fitted: Line[] = []
    for (let edge = 0; edge < 4; edge++) {
      const a = corners[edge], b = corners[(edge+1)%4], length = Math.hypot(b.x-a.x, b.y-a.y), step = Math.max(3, Math.min(width, height) * .02)
      const nx = -(b.y-a.y) / length * step, ny = (b.x-a.x) / length * step
      let count = 0, contrast = 0
      const offsets: number[] = [], band = Math.min(width, height) * .03
      for (let i = 1; i <= 15; i++) {
        const x = a.x + (b.x-a.x) * i/16, y = a.y + (b.y-a.y) * i/16
        let bestDifference = -Infinity, bestOffset = 0
        for (const offset of [-band, -band/2, 0, band/2, band]) {
          const ox = x + nx / step * offset, oy = y + ny / step * offset
          const difference = pixel(ox+nx, oy+ny) - pixel(ox-nx, oy-ny) - Math.abs(offset) * .3
          if (difference > bestDifference) { bestDifference = difference; bestOffset = offset }
        }
        if (bestDifference >= 10) { count++; offsets.push(bestOffset) }
        contrast += Math.max(-30, Math.min(80, bestDifference))
      }
      if (count < 7 || contrast / 15 < 12 || count < 10 && ++partial > 1) { supported = false; break }
      score += count / 15
      offsets.sort((a, b) => a - b)
      const padding = Math.max(3, Math.min(width, height) * .015)
      fitted.push({ a: nx / step, b: ny / step, r: (nx*a.x + ny*a.y) / step + (offsets[Math.floor(offsets.length/2)] ?? 0) - padding, strength: 0 })
    }
    const strength = [left, right, top, bottom].reduce((sum, line, i) => sum + line.strength / peaks[i][0].strength, 0) / 4
    const candidateScore = area * score * (.6 + .4 * strength)
    if (!supported || candidateScore <= bestScore) continue
    if (hasPaperContinuation(image, corners)) continue
    const adjusted = [intersect(fitted[3], fitted[0]), intersect(fitted[0], fitted[1]), intersect(fitted[1], fitted[2]), intersect(fitted[2], fitted[3])]
    if (adjusted.some(p => !p)) continue
    const result = adjusted.map(p => ({ x: Math.max(0, Math.min(1, p!.x / width)), y: Math.max(0, Math.min(1, p!.y / height)) })) as Quad
    if (!validPaperCorners(result, 1, 1)) continue
    bestScore = candidateScore
    best = result
  }
  return best
}
