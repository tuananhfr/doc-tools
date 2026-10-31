/** Remove slow paper/shadow changes without binarizing faint Vietnamese marks.
 * The brightest channel suppresses coloured highlighter while retaining black print.
 * One integral image bounds memory; callers use this only on a text band/cell.
 */
export function normalizeOcrLighting(rgba: Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const stride = width + 1, sum = new Float64Array(stride * (height + 1)), gray = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    let row = 0
    for (let x = 0; x < width; x++) {
      const i = y * width + x, p = i * 4
      row += gray[i] = Math.max(rgba[p], rgba[p + 1], rgba[p + 2])
      sum[(y + 1) * stride + x + 1] = sum[y * stride + x + 1] + row
    }
  }
  const radius = Math.max(12, Math.min(64, Math.round(Math.min(width, height) / 2))), output = new Uint8ClampedArray(rgba.length)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const left = Math.max(0, x - radius), right = Math.min(width, x + radius + 1)
    const top = Math.max(0, y - radius), bottom = Math.min(height, y + radius + 1)
    const mean = (sum[bottom * stride + right] - sum[top * stride + right] - sum[bottom * stride + left] + sum[top * stride + left]) / ((right - left) * (bottom - top))
    const i = y * width + x, p = i * 4
    const value = Math.max(0, Math.min(255, Math.round(255 - (mean - gray[i]) * 3)))
    output[p] = output[p + 1] = output[p + 2] = value; output[p + 3] = 255
  }
  return output
}
