import type { Quad } from '../types/text-layer.types'
import type { GrayImage } from './scan-analysis'
import { perspectiveMatrix, validPaperCorners } from './ocr-perspective'
import { transformPoint } from './ocr-transform'

/** A skewed grid can supply geometry when white paper has no visible outer edge. */
export function detectGridCorners(image: GrayImage): Quad | null {
  const { width, height, data } = image
  if (width < 40 || height < 40) return null
  const corners: Quad = [{ x: width, y: height }, { x: 0, y: height }, { x: 0, y: 0 }, { x: width, y: 0 }]
  let minSum = Infinity, maxSum = -Infinity, minDifference = Infinity, maxDifference = -Infinity
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[y * width + x] < 140) {
    if (x + y < minSum) { minSum = x + y; corners[0] = { x, y } }
    if (x - y > maxDifference) { maxDifference = x - y; corners[1] = { x, y } }
    if (x + y > maxSum) { maxSum = x + y; corners[2] = { x, y } }
    if (x - y < minDifference) { minDifference = x - y; corners[3] = { x, y } }
  }
  if (!validPaperCorners(corners, width, height)) return null
  const lengths = corners.map((point, index) => Math.hypot(point.x - corners[(index + 1) % 4].x, point.y - corners[(index + 1) % 4].y))
  if (Math.abs(lengths[0] - lengths[2]) / Math.max(lengths[0], lengths[2]) < .03 && Math.abs(lengths[1] - lengths[3]) / Math.max(lengths[1], lengths[3]) < .03) return null
  const ink = (x: number, y: number) => {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const sx = Math.round(x) + dx, sy = Math.round(y) + dy
      if (sx >= 0 && sy >= 0 && sx < width && sy < height && data[sy * width + sx] < 150) return true
    }
    return false
  }
  for (let edge = 0; edge < 4; edge++) {
    const a = corners[edge], b = corners[(edge + 1) % 4]
    let support = 0
    for (let step = 1; step < 40; step++) if (ink(a.x + (b.x - a.x) * step / 40, a.y + (b.y - a.y) * step / 40)) support++
    if (support < 35) return null
  }
  const toImage = perspectiveMatrix([{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }], corners)
  const bands = (vertical: boolean) => {
    let count = 0, previous = false
    for (let step = 5; step < 195; step++) {
      let support = 0
      for (let sample = 5; sample < 95; sample++) {
        const point = transformPoint(toImage, vertical ? { x: step / 200, y: sample / 100 } : { x: sample / 100, y: step / 200 })
        if (ink(point.x, point.y)) support++
      }
      const present = support >= 65
      if (present && !previous) count++
      previous = present
    }
    return count
  }
  if (bands(false) < 2 || bands(true) < 1) return null
  return corners.map(point => ({ x: point.x / width, y: point.y / height })) as Quad
}
