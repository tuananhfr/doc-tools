import type { GrayImage } from './scan-analysis'

/** Uniform white paper is excluded; saturated patches require darker surroundings. */
export function glareRegions(image: GrayImage): { x: number; y: number; width: number; height: number }[] {
  const size = Math.max(12, Math.floor(Math.min(image.width, image.height) / 12)), regions = []
  const mean = (x0: number, y0: number, width: number, height: number) => {
    let sum = 0, count = 0
    for (let y = Math.max(0, y0); y < Math.min(image.height, y0 + height); y++) for (let x = Math.max(0, x0); x < Math.min(image.width, x0 + width); x++) { sum += image.data[y * image.width + x]; count++ }
    return count ? sum / count : 255
  }
  for (let y = size; y + size * 2 < image.height; y += size) for (let x = size; x + size * 2 < image.width; x += size) {
    const center = mean(x, y, size, size)
    const surrounding = (mean(x - size, y, size, size) + mean(x + size, y, size, size) + mean(x, y - size, size, size) + mean(x, y + size, size, size)) / 4
    if (center > 252 && surrounding < 220) regions.push({ x: x / image.width, y: y / image.height, width: size / image.width, height: size / image.height })
  }
  return regions
}
