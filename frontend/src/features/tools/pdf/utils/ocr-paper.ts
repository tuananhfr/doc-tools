import type { Quad } from '../types/text-layer.types'
import type { GrayImage } from './scan-analysis'
import { validPaperCorners } from './ocr-perspective'

/** Automatic correction requires four bright paper edges separated from a dark background. */
export function detectPaperCorners(image: GrayImage): Quad | null {
  const { width, height, data } = image
  if (width < 40 || height < 40) return null
  const corners: Quad = [{ x: width, y: height }, { x: 0, y: height }, { x: 0, y: 0 }, { x: width, y: 0 }]
  let count = 0, minSum = Infinity, maxSum = -Infinity, minDifference = Infinity, maxDifference = -Infinity
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (data[y * width + x] >= 225) {
    count++
    if (x + y < minSum) { minSum = x + y; corners[0] = { x, y } }
    if (x - y > maxDifference) { maxDifference = x - y; corners[1] = { x, y } }
    if (x + y > maxSum) { maxSum = x + y; corners[2] = { x, y } }
    if (x - y < minDifference) { minDifference = x - y; corners[3] = { x, y } }
  }
  if (!validPaperCorners(corners, width, height) || corners.some(point => point.x < width * .02 || point.x > width * .98 || point.y < height * .02 || point.y > height * .98)) return null
  const area = Math.abs(corners.reduce((sum, point, index) => sum + point.x * corners[(index + 1) % 4].y - point.y * corners[(index + 1) % 4].x, 0)) / 2
  if (count / area < .8 || count / area > 1.15) return null
  const center = { x: corners.reduce((sum, point) => sum + point.x, 0) / 4, y: corners.reduce((sum, point) => sum + point.y, 0) / 4 }
  const pixel = (x: number, y: number) => x < 0 || y < 0 || x >= width || y >= height ? 255 : data[Math.round(y) * width + Math.round(x)]
  for (let edge = 0; edge < 4; edge++) {
    const a = corners[edge], b = corners[(edge + 1) % 4]
    let supported = 0
    for (let sample = 1; sample <= 8; sample++) {
      const ratio = sample / 9, x = a.x + (b.x - a.x) * ratio, y = a.y + (b.y - a.y) * ratio
      const dx = center.x - x, dy = center.y - y, length = Math.hypot(dx, dy), step = Math.max(2, Math.min(width, height) * .015)
      if (pixel(x + dx / length * step, y + dy / length * step) > 210 && pixel(x - dx / length * step, y - dy / length * step) < 165) supported++
    }
    if (supported < 7) return null
  }
  const top = Math.hypot(corners[1].x-corners[0].x, corners[1].y-corners[0].y), bottom = Math.hypot(corners[2].x-corners[3].x, corners[2].y-corners[3].y)
  const left = Math.hypot(corners[3].x-corners[0].x, corners[3].y-corners[0].y), right = Math.hypot(corners[2].x-corners[1].x, corners[2].y-corners[1].y)
  if (Math.abs(top-bottom)/Math.max(top,bottom) < .04 && Math.abs(left-right)/Math.max(left,right) < .04) return null
  return corners.map(point => ({ x: point.x / width, y: point.y / height })) as Quad
}
