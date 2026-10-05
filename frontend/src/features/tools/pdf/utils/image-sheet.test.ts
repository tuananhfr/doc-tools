import { describe, expect, it } from 'vitest'
import { A4_SIZE } from './page-geometry'
import { layoutSheet, pdfImagePlacement, rotatedSize } from './image-sheet'

const PHOTO_WIDE = { width: 4000, height: 3000 }
const PHOTO_TALL = { width: 3000, height: 4000 }
const MM = 72 / 25.4

describe('layoutSheet', () => {
  it('keeps the old A4 behaviour when no sheet is set', () => {
    for (const image of [PHOTO_WIDE, PHOTO_TALL]) {
      const { size, slots } = layoutSheet([image])
      expect(size).toEqual(image.width > image.height ? { width: A4_SIZE.height, height: A4_SIZE.width } : A4_SIZE)
      const [slot] = slots
      // Fits one side exactly and is centred on the other.
      expect(Math.min(size.width - slot.width, size.height - slot.height)).toBeCloseTo(0)
      expect(slot.x * 2 + slot.width).toBeCloseTo(size.width)
      expect(slot.y * 2 + slot.height).toBeCloseTo(size.height)
    }
  })

  it('applies paper size, orientation and margin', () => {
    const { size, slots } = layoutSheet([PHOTO_TALL], { paper: 'a3', margin: 10 })
    expect(size.width).toBeCloseTo(841.89)
    expect(size.height).toBeCloseTo(1190.55)
    expect(slots[0].x).toBeCloseTo(10 * MM)
    expect(slots[0].width).toBeCloseTo(841.89 - 20 * MM)

    const letter = layoutSheet([PHOTO_WIDE], { paper: 'letter', margin: 0 })
    expect(letter.size).toEqual({ width: 792, height: 612 })
  })

  it('hugs the image for "fit" and adds the margin around it', () => {
    const { size, slots } = layoutSheet([PHOTO_WIDE], { paper: 'fit', margin: 20 })
    expect(slots[0]).toMatchObject({ x: 20 * MM, y: 20 * MM })
    expect(slots[0].width / slots[0].height).toBeCloseTo(4 / 3)
    expect(size.width).toBeCloseTo(slots[0].width + 40 * MM)
    expect(size.height).toBeCloseTo(slots[0].height + 40 * MM)
    expect(Math.max(size.width, size.height)).toBeLessThanOrEqual(841.9)
  })

  it('stacks two wide photos on a portrait sheet and puts two tall ones side by side', () => {
    const wide = layoutSheet([PHOTO_WIDE, PHOTO_WIDE])
    expect(wide.size.height).toBeGreaterThan(wide.size.width)
    expect(wide.slots[1].y).toBeGreaterThan(wide.slots[0].y + wide.slots[0].height)

    const tall = layoutSheet([PHOTO_TALL, PHOTO_TALL])
    expect(tall.size.width).toBeGreaterThan(tall.size.height)
    expect(tall.slots[1].x).toBeGreaterThan(tall.slots[0].x + tall.slots[0].width)
  })

  it('lays four photos out 2 × 2 without overlap, inside the margin', () => {
    const { size, slots } = layoutSheet([PHOTO_WIDE, PHOTO_TALL, PHOTO_WIDE, PHOTO_TALL], { paper: 'a4', margin: 10 })
    expect(slots).toHaveLength(4)
    for (const slot of slots) {
      expect(slot.x).toBeGreaterThanOrEqual(10 * MM - 0.01)
      expect(slot.y).toBeGreaterThanOrEqual(10 * MM - 0.01)
      expect(slot.x + slot.width).toBeLessThanOrEqual(size.width - 10 * MM + 0.01)
      expect(slot.y + slot.height).toBeLessThanOrEqual(size.height - 10 * MM + 0.01)
    }
    expect(slots[1].x).toBeGreaterThan(slots[0].x + slots[0].width)
    expect(slots[2].y).toBeGreaterThan(slots[0].y + slots[0].height)
  })

  it('uses A4 for "fit" on a collage', () => {
    expect(layoutSheet([PHOTO_WIDE, PHOTO_WIDE], { paper: 'fit', margin: 0 }).size.height).toBeCloseTo(841.89)
  })
})

describe('rotatedSize', () => {
  it('swaps sides on quarter turns', () => {
    expect(rotatedSize(PHOTO_WIDE, 90)).toEqual(PHOTO_TALL)
    expect(rotatedSize(PHOTO_WIDE, 180)).toEqual(PHOTO_WIDE)
  })
})

describe('pdfImagePlacement', () => {
  // Corners of the image after pdf-lib rotates it counter-clockwise about (x, y).
  function covered(p: ReturnType<typeof pdfImagePlacement>) {
    const r = (p.rotate * Math.PI) / 180
    const corner = (u: number, v: number) => ({ x: p.x + u * Math.cos(r) - v * Math.sin(r), y: p.y + u * Math.sin(r) + v * Math.cos(r) })
    const points = [corner(0, 0), corner(p.width, 0), corner(0, p.height), corner(p.width, p.height)]
    const xs = points.map((point) => point.x)
    const ys = points.map((point) => point.y)
    return { left: Math.min(...xs), right: Math.max(...xs), bottom: Math.min(...ys), top: Math.max(...ys) }
  }

  it('fills the slot exactly at every rotation', () => {
    const slot = { x: 30, y: 40, width: 200, height: 120 }
    for (const rotation of [0, 90, 180, 270] as const) {
      const box = covered(pdfImagePlacement(slot, rotation, 800))
      expect(box.left).toBeCloseTo(30)
      expect(box.right).toBeCloseTo(230)
      expect(box.top).toBeCloseTo(800 - 40)
      expect(box.bottom).toBeCloseTo(800 - 160)
    }
  })

  it('turns the image top towards the right for a clockwise quarter turn', () => {
    const p = pdfImagePlacement({ x: 0, y: 0, width: 100, height: 200 }, 90, 200)
    const r = (p.rotate * Math.PI) / 180
    // Image "up" (0, 1) in its own frame must point to +x (right) on the page.
    expect(-Math.sin(r)).toBeCloseTo(1)
    expect(Math.cos(r)).toBeCloseTo(0)
  })
})
