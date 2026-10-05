/** Kênh màu 0–255, số nguyên. */
export interface Rgb {
  r: number
  g: number
  b: number
}

/** `h` 0–359, `s` / `l` 0–100, số nguyên — đúng dạng viết trong CSS. */
export interface Hsl {
  h: number
  s: number
  l: number
}

const clamp = (value: number, max: number) => Math.min(max, Math.max(0, value))

/** Nhận "#DA3548", "da3548", "#d35" — có hay không dấu #. */
export function parseHex(input: string): Rgb | null {
  const text = input.trim().replace(/^#/, '')
  if (!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(text)) return null
  const full = text.length === 3 ? Array.from(text, (char) => char + char).join('') : text
  return { r: parseInt(full.slice(0, 2), 16), g: parseInt(full.slice(2, 4), 16), b: parseInt(full.slice(4, 6), 16) }
}

/** Ba con số của một chuỗi kiểu "218, 53, 72" / "rgb(218 53 72)" / "353° 69% 53%". */
function threeNumbers(input: string, prefix: RegExp): number[] | null {
  const body = input.trim().replace(prefix, '').replace(/[()]/g, ' ')
  const parts = body.split(/[\s,/]+/).filter(Boolean)
  if (parts.length !== 3) return null
  const numbers = parts.map((part) => Number(part.replace(/(%|°|deg)$/i, '')))
  return numbers.every((value) => Number.isFinite(value)) ? numbers : null
}

export function parseRgb(input: string): Rgb | null {
  const numbers = threeNumbers(input, /^rgba?/i)
  if (!numbers || numbers.some((value) => value < 0 || value > 255)) return null
  const [r, g, b] = numbers.map((value) => Math.round(value))
  return { r, g, b }
}

export function parseHsl(input: string): Hsl | null {
  const numbers = threeNumbers(input, /^hsla?/i)
  if (!numbers) return null
  const [h, s, l] = numbers
  if (h < 0 || h > 360 || s < 0 || s > 100 || l < 0 || l > 100) return null
  return { h: Math.round(h) % 360, s: Math.round(s), l: Math.round(l) }
}

export function formatHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((value) => clamp(Math.round(value), 255).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

export function formatRgb({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`
}

export function formatHsl({ h, s, l }: Hsl): string {
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const delta = max - min
  const light = (max + min) / 2

  let hue = 0
  if (delta !== 0) {
    if (max === red) hue = ((green - blue) / delta) % 6
    else if (max === green) hue = (blue - red) / delta + 2
    else hue = (red - green) / delta + 4
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * light - 1))

  return { h: (Math.round(hue * 60) + 360) % 360, s: Math.round(saturation * 100), l: Math.round(light * 100) }
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const saturation = s / 100
  const light = l / 100
  const chroma = (1 - Math.abs(2 * light - 1)) * saturation
  const sector = (h % 360) / 60
  const second = chroma * (1 - Math.abs((sector % 2) - 1))
  const [red, green, blue] =
    sector < 1 ? [chroma, second, 0] : sector < 2 ? [second, chroma, 0] : sector < 3 ? [0, chroma, second] : sector < 4 ? [0, second, chroma] : sector < 5 ? [second, 0, chroma] : [chroma, 0, second]
  const lift = light - chroma / 2
  return { r: Math.round((red + lift) * 255), g: Math.round((green + lift) * 255), b: Math.round((blue + lift) * 255) }
}

/** Độ sáng tương đối theo WCAG 2 (0 = đen, 1 = trắng). */
export function luminance({ r, g, b }: Rgb): number {
  const [red, green, blue] = [r, g, b].map((value) => {
    const channel = value / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

/** Tỷ lệ tương phản WCAG giữa hai màu, 1–21. */
export function contrastRatio(first: Rgb, second: Rgb): number {
  const a = luminance(first)
  const b = luminance(second)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

export type ContrastLevel = 'aaa' | 'aa' | 'large' | 'fail'

/** Mức đạt của chữ cỡ thường: AAA ≥ 7, AA ≥ 4,5; từ 3 chỉ đủ cho chữ lớn / icon. */
export function contrastLevel(ratio: number): ContrastLevel {
  return ratio >= 7 ? 'aaa' : ratio >= 4.5 ? 'aa' : ratio >= 3 ? 'large' : 'fail'
}

export const WHITE: Rgb = { r: 255, g: 255, b: 255 }
export const BLACK: Rgb = { r: 0, g: 0, b: 0 }
