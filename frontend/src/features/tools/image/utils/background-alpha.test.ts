import { describe, expect, it, vi } from 'vitest'
import { composeBackgroundAlpha, renderBackgroundAlpha } from './background-alpha'
import { STROKE_ERASE, STROKE_KEEP, STROKE_NONE } from './mask-strokes'

vi.stubGlobal('ImageData', class {
  constructor(public data: Uint8ClampedArray, public width: number, public height: number) {}
})

describe('AI background alpha', () => {
  it('preserves soft model edges while brush corrections override individual pixels', () => {
    const output = new Uint8Array(4)
    composeBackgroundAlpha(new Uint8Array([64, 128, 192, 255]), new Uint8Array([STROKE_NONE, STROKE_KEEP, STROKE_ERASE, STROKE_NONE]), output)
    expect([...output]).toEqual([64, 255, 0, 255])
  })

  it('multiplies original transparency instead of replacing it with the model mask', () => {
    const source = new ImageData(new Uint8ClampedArray([100, 150, 200, 128, 10, 20, 30, 0]), 2, 1)
    const result = renderBackgroundAlpha(source, new Uint8Array([128, 255]), null)
    expect([...result.data]).toEqual([100, 150, 200, 64, 10, 20, 30, 0])
    expect([...source.data]).toEqual([100, 150, 200, 128, 10, 20, 30, 0])
  })

  it('composites partial edges onto a solid background instead of cutting them out', () => {
    const source = new ImageData(new Uint8ClampedArray([255, 0, 0, 255, 1, 2, 3, 255]), 2, 1)
    expect([...renderBackgroundAlpha(source, new Uint8Array([128, 0]), '#ffffff').data]).toEqual([255, 127, 127, 255, 255, 255, 255, 255])
    expect([...renderBackgroundAlpha(source, new Uint8Array([255, 0]), '#4a90d9').data]).toEqual([255, 0, 0, 255, 74, 144, 217, 255])
  })
})
