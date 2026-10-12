import { describe, expect, it } from 'vitest'
import { timeStretch } from './time-stretch'

const RATE = 22050
const tone = (hz: number, seconds: number) => Float32Array.from({ length: Math.round(seconds * RATE) }, (_, index) => 0.5 * Math.sin(2 * Math.PI * hz * index / RATE))
const crossings = (samples: Float32Array) => samples.reduce((count, value, index) => count + (index && Math.sign(value) !== Math.sign(samples[index - 1]) ? 1 : 0), 0)
const rms = (samples: Float32Array) => Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length)

describe('timeStretch', () => {
  it.each([0.5, 0.8, 1.5, 2])('changes duration by %s× and keeps pitch and loudness', (speed) => {
    const input = tone(220, 2)
    const output = timeStretch(input, speed, RATE)
    expect(output.length).toBe(Math.floor(input.length / speed))
    const pitch = crossings(output) / (output.length / RATE) / 2
    expect(pitch).toBeGreaterThan(210)
    expect(pitch).toBeLessThan(230)
    expect(rms(output.subarray(2000, -2000))).toBeCloseTo(rms(input), 1)
    expect(output.every(Number.isFinite)).toBe(true)
  })

  it('copies the input when speed is 1 or the clip is too short to stretch', () => {
    const input = tone(220, 0.5)
    const same = timeStretch(input, 1, RATE)
    expect(same).toEqual(input)
    expect(same).not.toBe(input)
    expect(timeStretch(input.subarray(0, 500), 2, RATE).length).toBe(500)
  })
})
