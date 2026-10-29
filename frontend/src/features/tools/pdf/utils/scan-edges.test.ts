import { describe, expect, it } from 'vitest'
import { detectPageEdges, hasPaperContinuation } from './scan-edges'
import { detectScanCorners } from './scan-paper'

function shadowedBook(mirror = false) {
  const width = 400, height = 500, data = new Uint8Array(width * height).fill(50)
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const paper = x >= 95 + y * .035 && x <= 350 + y * .07
      && y >= 65 - x * .07 && y <= 485 - x * .09
    // The neighboring page is cut by the photo, while the main page remains bounded.
    const neighbor = x < 72 + y * .01 && y > 10 && y < 490
    if (paper || neighbor) data[y * width + (mirror ? width - 1 - x : x)] = Math.round(240 - y * .24)
  }
  return { width, height, data }
}

describe('shadowed book page edges', () => {
  it.each([false, true])('does not treat a printed line inside a clipped sheet as its bottom edge (shaded: %s)', shaded => {
    const width = 400, height = 500, data = new Uint8Array(width * height).fill(60)
    for (let y = 50; y < height; y++) for (let x = 50; x < 350; x++) data[y * width + x] = shaded ? Math.max(145, 220 - Math.max(0, y - 250) * .7) : 210
    for (let y = 90; y < 470; y += 25) for (let x = 80; x < 320; x++) {
      data[y * width + x] = 35
      data[(y + 1) * width + x] = 35
    }
    const image = { width, height, data }
    expect(hasPaperContinuation(image, [{ x: 50, y: 50 }, { x: 350, y: 50 }, { x: 350, y: 330 }, { x: 50, y: 330 }])).toBe(true)
    const corners = detectScanCorners(image)
    // Retain the original when the real bottom boundary is outside the photo.
    expect(corners === null || Math.min(corners[2].y, corners[3].y) > .95).toBe(true)
  })

  it('accepts a genuine bottom edge with dark background beyond it', () => {
    const width = 400, height = 500, data = new Uint8Array(width * height).fill(60)
    for (let y = 50; y <= 330; y++) for (let x = 50; x <= 350; x++) data[y * width + x] = 210
    expect(hasPaperContinuation({ width, height, data }, [{ x: 50, y: 50 }, { x: 350, y: 50 }, { x: 350, y: 330 }, { x: 50, y: 330 }])).toBe(false)
  })
  it.each([false, true])('selects the complete dominant page, excluding its clipped neighbor (mirrored: %s)', mirror => {
    const image = shadowedBook(mirror), corners = detectPageEdges(image)
    expect(corners).not.toBeNull()
    const xs = corners!.map(p => mirror ? 1 - p.x : p.x)
    expect(Math.min(...xs)).toBeGreaterThan(.2)
    expect(Math.min(...xs)).toBeLessThan(.28)
    expect(Math.max(...xs)).toBeGreaterThan(.9)
    expect(Math.min(...corners!.map(p => p.y))).toBeLessThan(.12)
    expect(Math.max(...corners!.map(p => p.y))).toBeGreaterThan(.9)
    expect(detectScanCorners(image)).not.toBeNull()
  })

  it('requires four supported boundaries instead of cropping an indistinct image', () => {
    const image = shadowedBook()
    image.data.fill(150)
    expect(detectPageEdges(image)).toBeNull()
    for (let y = 50; y < 450; y++) for (let x = 0; x < 350; x++) image.data[y * image.width + x] = 230
    expect(detectPageEdges(image)).toBeNull()
  })
})
