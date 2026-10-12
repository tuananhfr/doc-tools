import { describe, expect, it } from 'vitest'
import { compositeOver, contrastRatio, flattenBackground, isLargeText, relativeLuminance, requiredContrast, type Rgba } from './contrast'

const WHITE: Rgba = [255, 255, 255, 1]
const BLACK: Rgba = [0, 0, 0, 1]

describe('contrastRatio', () => {
  it('spans 1 to 21', () => {
    expect(contrastRatio(BLACK, WHITE)).toBeCloseTo(21, 5)
    expect(contrastRatio(WHITE, BLACK)).toBeCloseTo(21, 5)
    expect(contrastRatio([12, 37, 77, 1], [12, 37, 77, 1])).toBeCloseTo(1, 5)
  })

  it('matches the known WCAG threshold grey #767676 on white', () => {
    expect(contrastRatio([118, 118, 118, 1], WHITE)).toBeCloseTo(4.54, 2)
  })

  it('composites translucent text over the background first', () => {
    expect(contrastRatio([0, 0, 0, 0.5], WHITE)).toBeCloseTo(3.98, 2)
  })

  it('pins the site tokens measured in WP2a', () => {
    // --cn-muted on --cn-surface (light) and the dark accent on the dark surface.
    expect(contrastRatio([83, 97, 116, 1], WHITE)).toBeCloseTo(6.31, 2)
    expect(contrastRatio([131, 184, 255, 1], [16, 30, 51, 1])).toBeCloseTo(8.18, 2)
  })
})

describe('relativeLuminance', () => {
  it('is 0 for black and 1 for white', () => {
    expect(relativeLuminance(BLACK)).toBe(0)
    expect(relativeLuminance(WHITE)).toBeCloseTo(1, 10)
  })
})

describe('compositeOver / flattenBackground', () => {
  it('mixes a half-transparent layer evenly', () => {
    expect(compositeOver([255, 0, 0, 0.5], [0, 0, 255, 1])).toEqual([127.5, 0, 127.5, 1])
  })

  it('stacks layers from the element up and falls back to white', () => {
    expect(flattenBackground([[255, 0, 0, 0.5], [0, 0, 255, 1]])).toEqual([127.5, 0, 127.5, 1])
    expect(flattenBackground([])).toEqual(WHITE)
    expect(flattenBackground([[0, 0, 0, 0]])).toEqual(WHITE)
  })
})

describe('large text thresholds', () => {
  it('treats 24px, or 18.66px bold, as large', () => {
    expect(isLargeText(24, 400)).toBe(true)
    expect(isLargeText(18.66, 700)).toBe(true)
    expect(isLargeText(18, 700)).toBe(false)
    expect(isLargeText(20, 400)).toBe(false)
  })

  it('asks 3:1 for large text and 4.5:1 otherwise', () => {
    expect(requiredContrast(24, 400)).toBe(3)
    expect(requiredContrast(17, 700)).toBe(4.5)
  })
})
