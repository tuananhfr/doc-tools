import type { Rgb } from './decorations'

export interface PixelRect {
  x: number
  y: number
  width: number
  height: number
}

export interface SampledColors {
  fill: Rgb
  /** `null` = vùng gần như một màu (không có chữ) — gọi bên ngoài tự chọn màu chữ. */
  ink: Rgb | null
}

// Chênh dưới ngưỡng này (thang 0–255) coi như cùng màu nền — nhiễu JPEG, vân giấy scan.
const INK_MIN_DISTANCE = 48

/**
 * Lấy màu nền + màu chữ của một vùng ảnh RGBA. Nền = màu nhiều điểm ảnh nhất
 * (chữ chỉ chiếm phần nhỏ khung); chữ = trung bình các điểm KHÁC nền nhất —
 * lấy trung bình cả vùng là ra màu xám pha giữa chữ và mép khử răng cưa.
 */
export function sampleColors(pixels: Uint8ClampedArray, imageWidth: number, rect: PixelRect): SampledColors {
  const x0 = Math.max(0, Math.floor(rect.x))
  const y0 = Math.max(0, Math.floor(rect.y))
  const x1 = Math.min(imageWidth, Math.ceil(rect.x + rect.width))
  const imageHeight = pixels.length / 4 / imageWidth
  const y1 = Math.min(imageHeight, Math.ceil(rect.y + rect.height))
  if (x1 <= x0 || y1 <= y0) return { fill: [1, 1, 1], ink: null }

  const buckets = new Map<number, { count: number; r: number; g: number; b: number }>()
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * imageWidth + x) * 4
      const key = ((pixels[i] >> 3) << 10) | ((pixels[i + 1] >> 3) << 5) | (pixels[i + 2] >> 3)
      const bucket = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 }
      bucket.count++
      bucket.r += pixels[i]
      bucket.g += pixels[i + 1]
      bucket.b += pixels[i + 2]
      buckets.set(key, bucket)
    }
  }
  let top = { count: 0, r: 0, g: 0, b: 0 }
  for (const bucket of buckets.values()) if (bucket.count > top.count) top = bucket
  const bg = [top.r / top.count, top.g / top.count, top.b / top.count]

  const distance = (i: number) => Math.hypot(pixels[i] - bg[0], pixels[i + 1] - bg[1], pixels[i + 2] - bg[2])
  let farthest = 0
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) farthest = Math.max(farthest, distance((y * imageWidth + x) * 4))

  const fill: Rgb = [bg[0] / 255, bg[1] / 255, bg[2] / 255]
  if (farthest < INK_MIN_DISTANCE) return { fill, ink: null }

  const sum = [0, 0, 0]
  let count = 0
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * imageWidth + x) * 4
      if (distance(i) < farthest * 0.7) continue
      sum[0] += pixels[i]
      sum[1] += pixels[i + 1]
      sum[2] += pixels[i + 2]
      count++
    }
  }
  return { fill, ink: [sum[0] / count / 255, sum[1] / count / 255, sum[2] / count / 255] }
}
