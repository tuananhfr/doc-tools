import { describe, expect, it } from 'vitest'
import { analyzeScan, estimateSkew, inkRatio, paperBounds, toGray, type GrayImage } from './scan-analysis'

const W = 600
const H = 800

/** Số giả ngẫu nhiên lặp lại được — ảnh thử giống nhau mọi lần chạy. */
function random(seed: number) {
  let state = seed
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }
}

function page(fill = 235): GrayImage {
  return { width: W, height: H, data: new Uint8Array(W * H).fill(fill) }
}

/** Các dòng "chữ" (khối từ tối) nghiêng `degrees` xuôi chiều kim đồng hồ quanh tâm trang, trong khung `area`. */
function writeLines(image: GrayImage, degrees: number, area = { x: 60, y: 80, width: 480, height: 640 }, seed = 7) {
  const next = random(seed)
  const radians = (degrees * Math.PI) / 180
  const cx = image.width / 2
  const cy = image.height / 2
  for (let line = area.y; line < area.y + area.height; line += 22) {
    let x = area.x
    while (x < area.x + area.width) {
      const word = 20 + Math.floor(next() * 50)
      for (let dx = 0; dx < word && x + dx < area.x + area.width; dx++) {
        for (let dy = 0; dy < 9; dy++) {
          if (next() < 0.45) continue
          const px = x + dx - cx
          const py = line + dy - cy
          const rx = Math.round(px * Math.cos(radians) - py * Math.sin(radians) + cx)
          const ry = Math.round(px * Math.sin(radians) + py * Math.cos(radians) + cy)
          if (rx >= 0 && rx < image.width && ry >= 0 && ry < image.height) image.data[ry * image.width + rx] = 30
        }
      }
      x += word + 8
    }
  }
  return image
}

function speckle(image: GrayImage, count: number, seed = 3) {
  const next = random(seed)
  for (let index = 0; index < count; index++) image.data[Math.floor(next() * image.data.length)] = 20
  return image
}

describe('toGray', () => {
  it('weights green highest, like the eye', () => {
    const gray = toGray(new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]), 3, 1)
    expect(gray.data[1]).toBeGreaterThan(gray.data[0])
    expect(gray.data[0]).toBeGreaterThan(gray.data[2])
  })
})

describe('blank pages', () => {
  it('ignores dust and the scanner shadow at the edge', () => {
    const image = speckle(page(), 400)
    // Bóng mép máy scan: dải tối 12px bên trái.
    for (let y = 0; y < H; y++) for (let x = 0; x < 12; x++) image.data[y * W + x] = 40
    expect(analyzeScan(image, { hasText: false }).blank).toBe(true)
  })

  it('keeps a page with a few lines of writing', () => {
    const image = writeLines(page(), 0, { x: 60, y: 300, width: 300, height: 40 })
    expect(inkRatio(image)).toBeGreaterThan(0.002)
    expect(analyzeScan(image, { hasText: false }).blank).toBe(false)
  })

  it('never calls a page with a text layer blank', () => {
    expect(analyzeScan(page(), { hasText: true })).toEqual({ blank: false, skew: null, paper: null })
  })
})

describe('estimateSkew', () => {
  it.each([2.4, -1.6, 3.8])('measures text tilted %s°', (degrees) => {
    expect(estimateSkew(writeLines(page(), degrees))).toBeCloseTo(degrees, 0)
  })

  it('leaves straight text and sparse pages alone', () => {
    expect(estimateSkew(writeLines(page(), 0))).toBeNull()
    expect(estimateSkew(writeLines(page(), 0.15))).toBeNull()
    expect(estimateSkew(writeLines(page(), 3, { x: 60, y: 300, width: 100, height: 10 }))).toBeNull()
  })
})

describe('paperBounds', () => {
  it('finds the sheet inside a dark border', () => {
    const image = page(50)
    for (let y = 60; y < 740; y++) for (let x = 40; x < 560; x++) image.data[y * W + x] = 230
    writeLines(image, 0, { x: 80, y: 100, width: 440, height: 600 })
    const box = paperBounds(image)!
    expect(box.x).toBeCloseTo(40 / W, 2)
    expect(box.y).toBeCloseTo(60 / H, 2)
    expect(box.width).toBeCloseTo(520 / W, 2)
    expect(box.height).toBeCloseTo(680 / H, 2)
    expect(analyzeScan(image, { hasText: false })).toMatchObject({ blank: false, skew: null })
  })

  it('does not trim a clean scan or a page with dark artwork', () => {
    expect(paperBounds(writeLines(page(), 0))).toBeNull()
    const artwork = page()
    // Ảnh tối lớn giữa trang (bản vẽ, ảnh chụp hiện trường) không phải viền.
    for (let y = 300; y < 500; y++) for (let x = 100; x < 500; x++) artwork.data[y * W + x] = 40
    expect(paperBounds(artwork)).toBeNull()
  })

  it('ignores a hairline border', () => {
    const image = page()
    for (let y = 0; y < H; y++) for (let x = 0; x < 4; x++) image.data[y * W + x] = 30
    expect(paperBounds(image)).toBeNull()
  })
})
