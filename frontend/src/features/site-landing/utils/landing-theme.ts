import type { LandingMode } from '../types/landing.types'

type Rgb = [number, number, number]

const parse = (hex: string): Rgb => [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16)) as Rgb
const format = (rgb: Rgb) => '#' + rgb.map(value => Math.round(value).toString(16).padStart(2, '0')).join('')
const mix = (from: Rgb, to: Rgb, amount: number): Rgb => from.map((value, index) => value + (to[index] - value) * amount) as Rgb

function luminance([r, g, b]: Rgb) {
  const [lr, lg, lb] = [r, g, b].map(value => { const c = value / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}

export function contrast(a: string, b: string) {
  const [high, low] = [luminance(parse(a)), luminance(parse(b))].sort((x, y) => y - x)
  return (high + 0.05) / (low + 0.05)
}

/** Moves `color` toward `target` in small steps until it reaches 4.5:1 against `background`. */
function readableOn(color: string, background: string, target: string) {
  for (let amount = 0; amount <= 1; amount += 0.05) {
    const candidate = format(mix(parse(color), parse(target), amount))
    if (contrast(candidate, background) >= 4.5) return candidate
  }
  return target
}

const BASE = {
  light: { bg: '#fbfcfe', surface: '#ffffff', card: '#ffffff', ink: '#0c254d', muted: '#536174', hero: '#f3f9ff', line: '#dce7f3', closing: '#132b4e', closingText: '#f5f8ff', closingMuted: '#c7d8f1', shadow: '0 18px 56px rgb(12 37 77 / 12%)', artOpacity: '1' },
  dark: { bg: '#101e33', surface: '#101e33', card: '#182b45', ink: '#eff5ff', muted: '#bac9dd', hero: '#182b45', line: '#354a66', closing: '#0a1526', closingText: '#f5f8ff', closingMuted: '#c7d8f1', shadow: '0 18px 56px rgb(4 14 30 / 25%)', artOpacity: '.15' },
} as const

/**
 * Staff pick any accent, so legibility is computed instead of trusted: link text is pushed darker
 * (light) or lighter (dark) until it passes 4.5:1, and button text is white or ink, whichever reads.
 */
export function landingPalette(rawAccent: string, rawMode: LandingMode) {
  // Every value here lands in an inline stylesheet, so nothing but #RRGGBB gets through.
  const accent = /^#[0-9a-f]{6}$/i.test(rawAccent) ? rawAccent.toLowerCase() : '#005be8'
  const mode: LandingMode = rawMode === 'dark' ? 'dark' : 'light'
  const base = BASE[mode]
  const accentText = readableOn(accent, base.bg, mode === 'light' ? '#000000' : '#ffffff')
  const buttonText = contrast('#ffffff', accent) >= contrast('#0c254d', accent) ? '#ffffff' : '#0c254d'
  return {
    ...base, mode, accent, accentText, buttonText,
    accentHover: format(mix(parse(accent), [0, 0, 0], 0.15)),
    tint: format(mix(parse(accent), parse(base.bg), mode === 'light' ? 0.9 : 0.8)),
    focus: accentText,
  }
}

export type LandingPalette = ReturnType<typeof landingPalette>
