import { describe, expect, it } from 'vitest'
import { setJpegDensity } from './jpeg-density'
import { layoutSheet, mmToPt, mmToPx, printDpi } from './photo-layout'

const A4 = { width: 210, height: 297 }
const P3X4 = { width: 30, height: 40 }

describe('đổi đơn vị', () => {
  it('mm sang điểm ảnh và sang pt', () => {
    expect(mmToPx(25.4, 300)).toBe(300)
    expect(mmToPx(210, 300)).toBe(2480)
    expect(mmToPx(297, 300)).toBe(3508)
    expect(mmToPt(25.4)).toBeCloseTo(72, 10)
    expect(mmToPt(210)).toBeCloseTo(595.28, 2)
  })

  it('DPI thật của ảnh thẻ', () => {
    expect(printDpi(354, 30)).toBe(300)
    expect(printDpi(120, 30)).toBe(102)
  })
})

describe('layoutSheet', () => {
  it('xếp kín A4 với ảnh 3 × 4, cách 2 mm, lề 5 mm', () => {
    const layout = layoutSheet(A4, P3X4, 2, 5, null)
    expect(layout.columns).toBe(6)
    expect(layout.rows).toBe(6)
    expect(layout.capacity).toBe(36)
    expect(layout.cells).toHaveLength(36)
    // Ngang 6 × 30 + 5 × 2 = 190 → trái 10; dọc 6 × 40 + 5 × 2 = 250 → trên 23,5.
    expect(layout.cells[0]).toEqual({ x: 10, y: 23.5 })
    expect(layout.cells[1]).toEqual({ x: 42, y: 23.5 })
    expect(layout.cells[6]).toEqual({ x: 10, y: 65.5 })
  })

  it('không ảnh nào thò ra ngoài lề, không ảnh nào chồng nhau', () => {
    for (const gap of [0, 2, 7]) {
      const layout = layoutSheet(A4, P3X4, gap, 5, null)
      for (const cell of layout.cells) {
        expect(cell.x).toBeGreaterThanOrEqual(5)
        expect(cell.y).toBeGreaterThanOrEqual(5)
        expect(cell.x + 30).toBeLessThanOrEqual(205)
        expect(cell.y + 40).toBeLessThanOrEqual(292)
      }
      expect(layout.cells[1].x - layout.cells[0].x).toBe(30 + gap)
    }
  })

  it('số bản ít hơn sức chứa thì căn giữa đúng số ảnh đó', () => {
    const layout = layoutSheet(A4, P3X4, 2, 5, 4)
    expect(layout.capacity).toBe(36)
    expect(layout.cells).toHaveLength(4)
    // Một hàng 4 ảnh: 4 × 30 + 3 × 2 = 126 → trái (210 − 126) / 2 = 42; trên (297 − 40) / 2.
    expect(layout.cells[0]).toEqual({ x: 42, y: 128.5 })
    expect(layout.cells[3].x).toBe(42 + 3 * 32)
  })

  it('xin nhiều hơn sức chứa thì chỉ xếp tới sức chứa', () => {
    expect(layoutSheet(A4, P3X4, 2, 5, 100).cells).toHaveLength(36)
  })

  it('ảnh to hơn giấy thì không xếp được ô nào', () => {
    const layout = layoutSheet({ width: 30, height: 40 }, { width: 40, height: 60 }, 2, 5, null)
    expect(layout.capacity).toBe(0)
    expect(layout.cells).toEqual([])
  })

  it('giấy ảnh 10 × 15 chứa 4 ảnh 4 × 6', () => {
    const layout = layoutSheet({ width: 102, height: 152 }, { width: 40, height: 60 }, 2, 5, null)
    expect([layout.columns, layout.rows]).toEqual([2, 2])
  })
})

describe('setJpegDensity', () => {
  const jfif = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xd9])

  it('ghi đơn vị dpi và mật độ vào khối JFIF', () => {
    const bytes = jfif()
    expect(setJpegDensity(bytes, 300)).toBe(true)
    expect(bytes[13]).toBe(1)
    expect([bytes[14], bytes[15], bytes[16], bytes[17]]).toEqual([0x01, 0x2c, 0x01, 0x2c])
  })

  it('tệp không mở đầu bằng JFIF thì để nguyên', () => {
    const exifFirst = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0, 0, 0, 0, 0, 0])
    const copy = exifFirst.slice()
    expect(setJpegDensity(exifFirst, 300)).toBe(false)
    expect(exifFirst).toEqual(copy)
    expect(setJpegDensity(new Uint8Array([1, 2, 3]), 300)).toBe(false)
  })
})
