import type { GrayImage } from './scan-analysis'
import { otsuThreshold } from './scan-analysis'

export function enhancePixels(rgba: Uint8ClampedArray, mode: 'contrast' | 'threshold' | 'blue-ink' | 'red-ink'): Uint8ClampedArray {
  const output = new Uint8ClampedArray(rgba.length), bins = new Array<number>(256).fill(0)
  const gray = new Uint8Array(rgba.length / 4)
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4
    gray[i] = mode === 'blue-ink' ? rgba[offset] : mode === 'red-ink' ? rgba[offset + 2] : (77 * rgba[offset] + 150 * rgba[offset + 1] + 29 * rgba[offset + 2]) >> 8
    bins[gray[i]]++
  }
  const quantile = (fraction: number) => {
    let count = 0
    for (let value = 0; value < 256; value++) { count += bins[value]; if (count >= gray.length * fraction) return value }
    return 255
  }
  const low = quantile(0.01), high = quantile(0.99), threshold = otsuThreshold(bins, gray.length)
  for (let i = 0; i < gray.length; i++) {
    const value = mode === 'threshold' ? gray[i] <= threshold ? 0 : 255 : high - low > 15 ? Math.round((gray[i] - low) * 255 / (high - low)) : gray[i]
    output[i * 4] = output[i * 4 + 1] = output[i * 4 + 2] = value
    output[i * 4 + 3] = 255
  }
  return output
}

export function rulingLines(image: GrayImage) {
  const rows: number[] = [], columns: number[] = []
  for (let y = 0; y < image.height; y++) {
    let ink = 0
    for (let x = 0; x < image.width; x++) if (image.data[y * image.width + x] < 150) ink++
    if (ink / image.width > 0.65) rows.push(y)
  }
  for (let x = 0; x < image.width; x++) {
    let ink = 0
    for (let y = 0; y < image.height; y++) if (image.data[y * image.width + x] < 150) ink++
    if (ink / image.height > 0.35) columns.push(x)
  }
  const bands = (values: number[]) => {
    const groups: number[][] = []
    for (const value of values) {
      const last = groups.at(-1)
      if (last && value - last.at(-1)! <= 3) last.push(value)
      else groups.push([value])
    }
    return groups.map(group => ({ start: group[0], end: group.at(-1)!, center: group.reduce((a, b) => a + b, 0) / group.length }))
  }
  const rowBands = bands(rows), columnBands = bands(columns)
  return { rows: rowBands.map(band => band.center), columns: columnBands.map(band => band.center), rowBands, columnBands }
}

export function suppressRulingPixels(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const gray = new Uint8Array(width * height)
  for (let index = 0; index < gray.length; index++) gray[index] = (77 * rgba[index * 4] + 150 * rgba[index * 4 + 1] + 29 * rgba[index * 4 + 2]) >> 8
  const lines = rulingLines({ width, height, data: gray }), output = new Uint8ClampedArray(rgba)
  if (lines.rows.length < 3 || lines.columns.length < 2) return output
  const erase = (x: number, y: number, vertical: boolean, start: number, end: number) => {
    const beforeX = vertical ? start - 2 : x, beforeY = vertical ? y : start - 2
    const afterX = vertical ? end + 2 : x, afterY = vertical ? y : end + 2
    if (beforeX < 0 || beforeY < 0 || afterX >= width || afterY >= height) return
    const before = gray[beforeY * width + beforeX], after = gray[afterY * width + afterX]
    // Crossing glyph strokes stay intact; only isolated ruling pixels are suppressed.
    if (before < 210 || after < 210) return
    const offset = (y * width + x) * 4
    const value = Math.round((before + after) / 2)
    output[offset] = output[offset + 1] = output[offset + 2] = value
  }
  for (const band of lines.rowBands) for (let y = band.start; y <= band.end; y++) for (let x = 0; x < width; x++) erase(x, y, false, band.start, band.end)
  for (const band of lines.columnBands) for (let x = band.start; x <= band.end; x++) for (let y = 0; y < height; y++) erase(x, y, true, band.start, band.end)
  return output
}
