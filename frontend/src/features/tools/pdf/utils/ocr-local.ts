import type { GrayImage } from './scan-analysis'
import type { OcrLine } from './ocr-runs'

/** Overlap provides context; it must not duplicate a line when two crops disagree on its centre. */
export function uniqueOcrLines(lines: OcrLine[], preferFirst = false) {
  const result: OcrLine[] = []
  const key = (line: OcrLine) => line.words.map(word => word.text).join('').normalize('NFC').replace(/[^\p{L}\p{N}]/gu, '')
  const score = (line: OcrLine) => line.words.reduce((sum, word) => sum + word.confidence * word.text.length, 0) / Math.max(1, line.words.reduce((sum, word) => sum + word.text.length, 0))
  for (const line of lines) {
    const text = key(line), box = line.bbox
    const index = text ? result.findIndex(other => {
      if (!preferFirst && key(other) !== text) return false
      const b = other.bbox, overlap = Math.max(0, Math.min(box.x1, b.x1) - Math.max(box.x0, b.x0)) * Math.max(0, Math.min(box.y1, b.y1) - Math.max(box.y0, b.y0))
      if (overlap <= .6 * Math.min((box.x1 - box.x0) * (box.y1 - box.y0), (b.x1 - b.x0) * (b.y1 - b.y0))) return false
      const x = (Math.max(box.x0, b.x0) + Math.min(box.x1, b.x1)) / 2
      const at = (value: OcrLine) => value.baseline.y0 + (x - value.baseline.x0) * (value.baseline.y1 - value.baseline.y0) / Math.max(1, value.baseline.x1 - value.baseline.x0)
      const heights = [...line.words, ...other.words].map(word => word.bbox.y1 - word.bbox.y0).sort((a, b) => a - b)
      return Math.abs(at(line) - at(other)) < heights[Math.floor(heights.length / 2)] * .6
    }) : -1
    if (index < 0) result.push(line)
    else if (!preferFirst && score(line) > score(result[index])) result[index] = line
  }
  return result
}

/** Sauvola threshold, evaluated one strip at a time to bound temporary memory. */
export function localOcrPixels(rgba: Uint8ClampedArray, width: number, height: number) {
  const stride = width + 1, gray = new Uint8Array(width * height)
  const sums = new Float64Array(stride * (height + 1)), squares = new Float64Array(sums.length)
  for (let y = 0; y < height; y++) {
    let sum = 0, square = 0
    for (let x = 0; x < width; x++) {
      const index = y * width + x, offset = index * 4
      // Light coloured highlighter should not become a dark block over black print.
      const value = gray[index] = Math.max(rgba[offset], rgba[offset + 1], rgba[offset + 2])
      sum += value; square += value * value
      sums[(y + 1) * stride + x + 1] = sums[y * stride + x + 1] + sum
      squares[(y + 1) * stride + x + 1] = squares[y * stride + x + 1] + square
    }
  }
  const radius = Math.max(12, Math.round(width * 30 / 1282)), output = new Uint8ClampedArray(rgba.length)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1)
    const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1), count = (right - left) * (bottom - top)
    const box = (values: Float64Array) => values[bottom * stride + right] - values[top * stride + right] - values[bottom * stride + left] + values[top * stride + left]
    const mean = box(sums) / count, deviation = Math.sqrt(Math.max(0, box(squares) / count - mean * mean))
    const offset = (y * width + x) * 4, value = gray[y * width + x] < mean * (1 + .3 * (deviation / 128 - 1)) ? 0 : 255
    output[offset] = output[offset + 1] = output[offset + 2] = value; output[offset + 3] = 255
  }
  return output
}

/** Rotation to APPLY, measured locally: a curved page need not have one global angle. */
export function localOcrAngle(image: GrayImage) {
  const { width, height, data } = image, points: { x: number; y: number }[] = []
  for (let y = 4; y < height - 4; y++) for (let x = 8; x < width - 8; x++) {
    if (data[y * width + x] < 135) points.push({ x: x - width / 2, y })
  }
  if (points.length < width * height * .003) return 0
  const rows = new Uint32Array(height + width * 2), score = (angle: number) => {
    rows.fill(0)
    const slope = Math.tan(angle * Math.PI / 180)
    for (const point of points) rows[Math.round(point.y + slope * point.x) + width]++
    let value = 0
    for (const count of rows) value += count * count
    return value
  }
  const straight = score(0)
  let best = 0, maximum = straight
  for (let angle = -12; angle <= 12; angle += .25) {
    const value = score(angle)
    if (value > maximum) { maximum = value; best = angle }
  }
  return maximum >= straight * 1.03 && Math.abs(best) < 12 ? best : 0
}

export function ocrStrips(width: number, height: number) {
  const count = Math.max(2, Math.min(8, Math.ceil(height / (width * .25)))), step = height / count
  const overlap = Math.round(width * 100 / 1282)
  return Array.from({ length: count }, (_, index) => {
    const top = Math.max(0, Math.floor(index * step - overlap)), bottom = Math.min(height, Math.ceil((index + 1) * step + overlap))
    return { top, height: bottom - top, start: index * step, end: (index + 1) * step }
  })
}
