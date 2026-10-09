import { describe, expect, it } from 'vitest'
import { contrast, landingPalette } from './landing-theme'

describe('landingPalette', () => {
  it('keeps a readable brand accent as is', () => {
    const palette = landingPalette('#005be8', 'light')
    expect(palette.accentText).toBe('#005be8')
    expect(palette.buttonText).toBe('#ffffff')
  })

  it('darkens a pale accent for link text but keeps it for the button fill', () => {
    const palette = landingPalette('#ffd400', 'light')
    expect(palette.accent).toBe('#ffd400')
    expect(contrast(palette.accentText, palette.bg)).toBeGreaterThanOrEqual(4.5)
    expect(palette.buttonText).toBe('#0c254d')
  })

  it('lightens a deep accent on the dark page', () => {
    const palette = landingPalette('#0a2a6b', 'dark')
    expect(contrast(palette.accentText, palette.bg)).toBeGreaterThanOrEqual(4.5)
    expect(palette.bg).toBe('#101e33')
  })

  it('always picks the more readable button text', () => {
    for (const accent of ['#c8102e', '#00a86b', '#7f7f7f', '#ffffff', '#000000']) {
      const { buttonText } = landingPalette(accent, 'light')
      const other = buttonText === '#ffffff' ? '#0c254d' : '#ffffff'
      expect(contrast(buttonText, accent)).toBeGreaterThanOrEqual(contrast(other, accent))
    }
  })
})

describe('landingPalette input guard', () => {
  it('never lets a non-hex accent reach the stylesheet', () => {
    const palette = landingPalette('red;}</style><script>', 'light')
    expect(palette.accent).toBe('#005be8')
    expect(JSON.stringify(palette)).not.toContain('<')
  })
})
