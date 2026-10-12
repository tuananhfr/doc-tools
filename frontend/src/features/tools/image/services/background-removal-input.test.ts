import { describe, expect, it } from 'vitest'
import { normalizeBackgroundAlpha, normalizeBackgroundInput } from './background-removal-input'
import model from './background-removal-model.json'

describe('U2-NetP input and output', () => {
  it('uses the trained channel order and normalizes by the image maximum', () => {
    const pixels = new Uint8ClampedArray(model.inputSize ** 2 * 4)
    pixels.set([128, 64, 0, 255])
    const input = normalizeBackgroundInput(pixels)
    expect(input[0]).toBeCloseTo((1 - 0.485) / 0.229)
    expect(input[model.inputSize ** 2]).toBeCloseTo((0.5 - 0.456) / 0.224)
    expect(input[model.inputSize ** 2 * 2]).toBeCloseTo(-0.406 / 0.225)
    expect([...normalizeBackgroundInput(new Uint8ClampedArray(pixels.length))].every(Number.isFinite)).toBe(true)
  })

  it('retains intermediate alpha values and rejects invalid or empty predictions', () => {
    const prediction = new Float32Array(model.inputSize ** 2).fill(0.5)
    prediction[0] = 0; prediction[1] = 1
    expect([...normalizeBackgroundAlpha(prediction).slice(0, 3)]).toEqual([0, 255, 127])
    prediction[2] = NaN
    expect(() => normalizeBackgroundAlpha(prediction)).toThrow('INVALID_MODEL_OUTPUT')
    expect(() => normalizeBackgroundAlpha(new Float32Array(prediction.length))).toThrow('EMPTY_MODEL_OUTPUT')
    expect(() => normalizeBackgroundInput(new Uint8ClampedArray(4))).toThrow('INVALID_MODEL_INPUT')
  })
})
