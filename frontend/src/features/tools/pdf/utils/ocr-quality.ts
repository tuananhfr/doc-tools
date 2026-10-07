import type { OcrQualityFlag } from '../types/ocr-result.types'
import type { GrayImage } from './scan-analysis'

/** Conservative image hints; they never imply that recognition is accurate. */
export function ocrQuality(image: GrayImage, nativeSize?: { width: number; height: number }): OcrQualityFlag[] {
  const flags: OcrQualityFlag[] = []
  const { width, height, data } = image
  if (nativeSize && Math.max(nativeSize.width, nativeSize.height) < 1000) flags.push('low-resolution')
  const bins = new Uint32Array(256)
  for (const value of data) bins[value]++
  const quantile = (fraction: number) => {
    let count = 0
    for (let value = 0; value < 256; value++) { count += bins[value]; if (count >= data.length * fraction) return value }
    return 255
  }
  if (quantile(0.99) - quantile(0.01) < 25) flags.push('low-contrast')
  let edge = 0
  let ink = 0
  let count = 0
  for (let y = 1; y < height - 1; y++) for (let x = 1; x < width - 1; x++) {
    const index = y * width + x
    if (data[index] < 180) ink++
    const laplacian = data[index - width] + data[index + width] + data[index - 1] + data[index + 1] - 4 * data[index]
    edge += laplacian * laplacian
    count++
  }
  if (count && ink / count < 0.0002) flags.push('blank')
  else if (count && edge / count < 12) flags.push('blur')
  return flags
}
