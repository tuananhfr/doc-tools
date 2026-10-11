import { describe, expect, it } from 'vitest'
import { detectGridCorners } from './ocr-grid-corners'

function grid(internal = true, perspective = true) {
  const image = { width: 200, height: 200, data: new Uint8Array(40000).fill(255) }
  for (let y = 30; y <= 170; y++) {
    const left = perspective ? 55 - (y - 30) / 7 : 35, right = perspective ? 145 + (y - 30) / 7 : 165
    for (let x = Math.round(left); x <= Math.round(right); x++) {
      if (y === 30 || y === 170 || Math.abs(x - left) <= 1 || Math.abs(x - right) <= 1 || internal && ([65, 100, 135].includes(y) || Math.abs(x - 100) <= 1)) image.data[y * 200 + x] = 0
    }
  }
  return image
}
describe('perspective grid geometry on white paper', () => {
  it('requires both a complete border and supported internal separators', () => {
    const image = grid()
    expect(detectGridCorners(image)?.[0].x).toBeCloseTo(55 / 200, 1)
    expect(detectGridCorners(grid(false))).toBeNull()
    for (let y = 31; y < 170; y++) for (let x = 120; x < 200; x++) image.data[y * 200 + x] = 255
    expect(detectGridCorners(image)).toBeNull()
  })
  it('leaves a straight grid and a plain scan untouched', () => {
    expect(detectGridCorners(grid(true, false))).toBeNull()
    expect(detectGridCorners({ width: 200, height: 200, data: new Uint8Array(40000).fill(255) })).toBeNull()
  })
})
