/**
 * Tương phản WCAG 2.x (relative luminance) — thuần, không DOM, để `check-a11y.mjs` (Node 24 chạy thẳng
 * file .ts) và vitest dùng chung một công thức.
 */

/** r, g, b trong 0–255; a trong 0–1. */
export type Rgba = readonly [number, number, number, number]

const WHITE: Rgba = [255, 255, 255, 1]

function channel(value: number): number {
  const c = value / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance([r, g, b]: Rgba): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** Phủ màu `top` (có alpha) lên `bottom`; kết quả mang alpha gộp. */
export function compositeOver(top: Rgba, bottom: Rgba): Rgba {
  const a = top[3] + bottom[3] * (1 - top[3])
  if (a === 0) return [0, 0, 0, 0]
  const mix = (i: 0 | 1 | 2) => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a
  return [mix(0), mix(1), mix(2), a]
}

/**
 * Gộp các lớp nền từ phần tử đi lên gốc (phần tử trước, gốc sau) thành một màu đục.
 * Hết lớp mà vẫn còn trong suốt thì coi như nền trắng của trình duyệt.
 */
export function flattenBackground(layers: readonly Rgba[]): Rgba {
  let result: Rgba = WHITE
  for (let i = layers.length - 1; i >= 0; i -= 1) result = compositeOver(layers[i], result)
  return [result[0], result[1], result[2], 1]
}

/** Tỉ lệ tương phản 1–21; chữ có alpha được phủ lên nền trước khi tính. */
export function contrastRatio(fg: Rgba, bg: Rgba): number {
  const base = flattenBackground([bg])
  const text = compositeOver(fg, base)
  const l1 = relativeLuminance(text)
  const l2 = relativeLuminance(base)
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1]
  return (hi + 0.05) / (lo + 0.05)
}

/** WCAG: chữ lớn = ≥24px, hoặc ≥18.66px (14pt) đậm từ 700. */
export function isLargeText(fontPx: number, fontWeight: number): boolean {
  return fontPx >= 24 || (fontPx >= 18.66 && fontWeight >= 700)
}

export function requiredContrast(fontPx: number, fontWeight: number): 3 | 4.5 {
  return isLargeText(fontPx, fontWeight) ? 3 : 4.5
}
