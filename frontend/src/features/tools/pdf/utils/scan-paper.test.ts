import { describe, expect, it } from 'vitest'
import { detectScanCorners } from './scan-paper'

function paper(brightness: number, background = 70) {
  const width = 180, height = 220, data = new Uint8Array(width * height).fill(background)
  for (let y = 30; y <= 190; y++) for (let x = 35; x <= 145; x++) data[y * width + x] = brightness
  // Printed lines and accents must not split the paper into separate candidates.
  for (let y = 55; y < 170; y += 15) for (let x = 50; x < 132; x++) data[y * width + x] = 35
  return { width, height, data }
}

describe('automatic scan paper detection', () => {
  it.each([255, 200, 170])('finds the complete paper boundary at brightness %i', brightness => {
    const image = paper(brightness), corners = detectScanCorners(image)
    expect(corners).not.toBeNull()
    expect(corners![0].x).toBeCloseTo(35 / image.width, 1)
    expect(corners![0].y).toBeCloseTo(30 / image.height, 1)
    expect(corners![2].x).toBeCloseTo(145 / image.width, 1)
    expect(corners![2].y).toBeCloseTo(190 / image.height, 1)
  })
  it('does not crop an already filled scan or an indistinct edge', () => {
    expect(detectScanCorners({ width: 180, height: 220, data: new Uint8Array(180 * 220).fill(255) })).toBeNull()
    expect(detectScanCorners(paper(180, 177))).toBeNull()
  })
  it('rejects a bright round object instead of cutting it into a rectangle', () => {
    const width = 180, height = 220, data = new Uint8Array(width * height).fill(70)
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (Math.hypot(x - 90, y - 110) < 75) data[y * width + x] = 200
    expect(detectScanCorners({ width, height, data })).toBeNull()
  })
  it('ignores a small glare patch separate from the dominant document', () => {
    const image = paper(190)
    for (let y = 4; y < 16; y++) for (let x = 4; x < 16; x++) image.data[y * image.width + x] = 255
    const corners = detectScanCorners(image)
    expect(corners).not.toBeNull()
    expect(corners![0].x).toBeGreaterThan(.15)
  })
  it('leaves a clipped sheet intact when its boundary cannot be established', () => {
    const image = paper(190)
    for (let y = 30; y <= 190; y++) for (let x = 0; x < 35; x++) image.data[y * image.width + x] = 190
    expect(detectScanCorners(image)).toBeNull()
  })
})
