/** An optional reading variant, not a replacement for the original photograph.
 * Suppress red/blue annotations while retaining neutral black ink and warm paper. */
export function neutralPrintedPixels(raw: Uint8ClampedArray) {
  const pixels = new Uint8ClampedArray(raw)
  let changed = 0
  for (let offset = 0; offset < pixels.length; offset += 4) {
    const r = raw[offset], g = raw[offset + 1], b = raw[offset + 2]
    if (Math.max(r, g, b) - Math.min(r, g, b) <= 24) continue
    if (!(r > g * 1.15 && r > b * 1.15 || b > r * 1.15 && b > g * 1.1)) continue
    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 255; changed++
  }
  return { pixels, changed }
}
