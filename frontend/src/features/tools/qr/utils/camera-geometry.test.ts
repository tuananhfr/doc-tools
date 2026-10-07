import { describe, expect, it } from 'vitest'
import { cameraCrop, cameraPoint, detectionBounds } from './camera-geometry'

describe('camera geometry', () => {
  it('matches a landscape camera covering a portrait viewport', () => {
    const crop = cameraCrop(1920, 1080, 390, 650)
    expect(crop).toEqual({ x: 636, y: 0, width: 648, height: 1080 })
    expect(cameraPoint({ x: 960, y: 540 }, crop)).toEqual({ x: 50, y: 50 })
  })

  it('zooms the captured source around its center', () => {
    const crop = cameraCrop(1920, 1080, 390, 650, 2)
    expect(crop).toEqual({ x: 798, y: 270, width: 324, height: 540 })
    expect(cameraPoint({ x: 798, y: 270 }, crop)).toEqual({ x: 0, y: 0 })
    expect(cameraPoint({ x: 1122, y: 810 }, crop)).toEqual({ x: 100, y: 100 })
  })

  it('covers wide viewports without stretching a portrait source', () => {
    expect(cameraCrop(1080, 1920, 800, 400)).toEqual({ x: 0, y: 690, width: 1080, height: 540 })
  })

  it('includes the fourth corner of a rotated QR', () => {
    const box = detectionBounds([{ x: 20, y: 60 }, { x: 40, y: 20 }, { x: 80, y: 40 }], 'QR_CODE')!
    expect(box.x).toBeLessThan(20)
    expect(box.y).toBeLessThan(20)
    expect(box.x + box.width).toBeGreaterThanOrEqual(60)
    expect(box.y + box.height).toBeGreaterThan(80)
  })

  it('marks a linear barcode with a visible band and clips to the viewport', () => {
    const box = detectionBounds([{ x: 1, y: 50 }, { x: 99, y: 50 }], 'CODE_128')!
    expect(box).toEqual({ x: 0, y: 46, width: 100, height: 8 })
    expect(detectionBounds([], 'QR_CODE')).toBeNull()
  })

  it('does not draw a marker for a code outside the resized viewport', () => {
    expect(detectionBounds([{ x: 110, y: 50 }, { x: 150, y: 50 }], 'CODE_128')).toBeNull()
  })
})
