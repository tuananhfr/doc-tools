import bwipjs from 'bwip-js/node'
import { describe, expect, it } from 'vitest'
import { parseBarcodeSvg } from './svg-paths'

describe('parseBarcodeSvg', () => {
  it('đọc được vạch (nét) và chữ (tô) từ SVG thật của bwip-js', () => {
    const svg = bwipjs.toSVG({ bcid: 'code128', text: 'VT-01', includetext: true, height: 10, scale: 1 })
    const parsed = parseBarcodeSvg(svg)
    expect(parsed).not.toBeNull()
    expect(parsed!.width).toBeGreaterThan(50)
    expect(parsed!.paths.some((path) => path.strokeWidth !== null)).toBe(true)
    expect(parsed!.paths.some((path) => path.strokeWidth === null)).toBe(true)
  })

  it('SVG lạ thì null, không ném lỗi', () => {
    expect(parseBarcodeSvg('<svg></svg>')).toBeNull()
  })
})
