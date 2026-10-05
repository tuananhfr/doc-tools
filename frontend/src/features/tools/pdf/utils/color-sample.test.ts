import { describe, expect, it } from 'vitest'
import { sampleColors } from './color-sample'

function image(width: number, height: number, paint: (x: number, y: number) => [number, number, number]) {
  const pixels = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y)
      pixels.set([r, g, b, 255], (y * width + x) * 4)
    }
  }
  return pixels
}

describe('sampleColors', () => {
  it('nền là màu chiếm nhiều nhất, chữ là màu khác nền nhất (bỏ mép khử răng cưa)', () => {
    // Nền vàng nhạt, nét chữ xanh đậm dọc cột 4–5, mép xám pha ở cột 3 và 6.
    const pixels = image(12, 6, (x) => (x === 4 || x === 5 ? [20, 40, 120] : x === 3 || x === 6 ? [140, 145, 160] : [250, 240, 200]))
    const { fill, ink } = sampleColors(pixels, 12, { x: 0, y: 0, width: 12, height: 6 })
    expect(fill.map((v) => Math.round(v * 255))).toEqual([250, 240, 200])
    expect(ink?.map((v) => Math.round(v * 255))).toEqual([20, 40, 120])
  })

  it('vùng một màu (không có chữ) thì không có màu chữ', () => {
    const pixels = image(8, 8, (x, y) => [255 - ((x + y) % 3), 255, 255])
    expect(sampleColors(pixels, 8, { x: 1, y: 1, width: 5, height: 5 }).ink).toBeNull()
  })

  it('cắt vùng lấy mẫu vào trong ảnh', () => {
    const pixels = image(4, 4, () => [10, 10, 10])
    expect(sampleColors(pixels, 4, { x: -3, y: 2, width: 20, height: 20 }).fill.map((v) => Math.round(v * 255))).toEqual([10, 10, 10])
    expect(sampleColors(pixels, 4, { x: 9, y: 9, width: 2, height: 2 })).toEqual({ fill: [1, 1, 1], ink: null })
  })
})
