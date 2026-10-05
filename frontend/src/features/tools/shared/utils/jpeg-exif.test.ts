import { describe, expect, it } from 'vitest'
import { attachJpegExif, exifForRedraw, readJpegExif } from './jpeg-exif'

const MARKER = 'GPS-MARKER'
const THUMBNAIL = [0xff, 0xd8, 0xaa, 0xbb, 0xcc, 0xff, 0xd9]

/**
 * Khối EXIF tối thiểu: IFD0 (hướng = 6, con trỏ sang IFD chi tiết) → IFD1 (ảnh
 * xem trước), IFD chi tiết (kích thước 4000 × 3000), rồi ảnh xem trước và một
 * chuỗi đánh dấu đứng cuối khối.
 */
function buildExif(little: boolean): Uint8Array {
  const tiff = new Uint8Array(8 + 30 + 30 + 30 + THUMBNAIL.length + MARKER.length)
  const view = new DataView(tiff.buffer)
  const entry = (at: number, tag: number, type: number, value: number) => {
    view.setUint16(at, tag, little)
    view.setUint16(at + 2, type, little)
    view.setUint32(at + 4, 1, little)
    if (type === 3) view.setUint16(at + 8, value, little)
    else view.setUint32(at + 8, value, little)
  }
  const [ifd0, ifd1, detail] = [8, 38, 68]
  const thumbnailAt = 98

  view.setUint16(0, little ? 0x4949 : 0x4d4d)
  view.setUint16(2, 42, little)
  view.setUint32(4, ifd0, little)

  view.setUint16(ifd0, 2, little)
  entry(ifd0 + 2, 0x0112, 3, 6)
  entry(ifd0 + 14, 0x8769, 4, detail)
  view.setUint32(ifd0 + 26, ifd1, little)

  view.setUint16(ifd1, 2, little)
  entry(ifd1 + 2, 0x0201, 4, thumbnailAt)
  entry(ifd1 + 14, 0x0202, 4, THUMBNAIL.length)

  view.setUint16(detail, 2, little)
  entry(detail + 2, 0xa002, 4, 4000)
  entry(detail + 14, 0xa003, 3, 3000)

  tiff.set(THUMBNAIL, thumbnailAt)
  tiff.set(new TextEncoder().encode(MARKER), thumbnailAt + THUMBNAIL.length)
  return new Uint8Array([0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff])
}

const segment = (marker: number, payload: Uint8Array | number[]) => [0xff, marker, (payload.length + 2) >> 8, (payload.length + 2) & 0xff, ...payload]
const JFIF = segment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0])
const TAIL = [0xff, 0xdb, 0x00, 0x03, 0x00, 0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9]
const jpeg = (...segments: number[][]) => new Uint8Array([0xff, 0xd8, ...segments.flat(), ...TAIL])

const text = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes)

describe('readJpegExif', () => {
  it('finds the Exif block after a JFIF segment', () => {
    const exif = buildExif(true)
    expect(readJpegExif(jpeg(JFIF, segment(0xe1, exif)))).toEqual(exif)
  })

  it('skips an APP1 segment that is not Exif (XMP)', () => {
    const xmp = new TextEncoder().encode('http://ns.adobe.com/xap/1.0/\0<x/>')
    const exif = buildExif(false)
    expect(readJpegExif(jpeg(segment(0xe1, xmp), segment(0xe1, exif)))).toEqual(exif)
  })

  it('returns null without Exif, for a truncated block, and for a non-JPEG', () => {
    expect(readJpegExif(jpeg(JFIF))).toBeNull()
    expect(readJpegExif(jpeg(segment(0xe1, buildExif(true))).subarray(0, 40))).toBeNull()
    expect(readJpegExif(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBeNull()
  })
})

describe('exifForRedraw', () => {
  for (const little of [true, false]) {
    it(`resets orientation, size and thumbnail (${little ? 'little' : 'big'} endian)`, () => {
      const source = buildExif(little)
      const out = exifForRedraw(source, { width: 1280, height: 960 })!
      const view = new DataView(out.buffer, 6)

      expect(out.length).toBe(source.length)
      expect(view.getUint16(8 + 2 + 8, little)).toBe(1)
      expect(view.getUint32(68 + 2 + 8, little)).toBe(1280)
      expect(view.getUint16(68 + 14 + 8, little)).toBe(960)
      // Ảnh xem trước: gỡ khỏi chuỗi IFD và xoá cả dữ liệu.
      expect(view.getUint32(8 + 26, little)).toBe(0)
      expect([...out.subarray(6 + 98, 6 + 98 + THUMBNAIL.length)]).toEqual(THUMBNAIL.map(() => 0))
      // Phần còn lại của khối (ở đây: chuỗi đánh dấu) còn nguyên, và khối gốc không bị sửa.
      expect(text(out)).toContain(MARKER)
      expect(new DataView(source.buffer, 6).getUint16(8 + 2 + 8, little)).toBe(6)
    })
  }

  it('keeps the orientation flag when the pixels were not rotated', () => {
    const out = exifForRedraw(buildExif(true), { width: 1280, height: 960 }, 'as-is')!
    const view = new DataView(out.buffer, 6)
    expect(view.getUint16(8 + 2 + 8, true)).toBe(6)
    expect(view.getUint32(68 + 2 + 8, true)).toBe(1280)
  })

  it('returns null for a block it cannot parse', () => {
    const broken = buildExif(true)
    broken[6] = 0x00
    expect(exifForRedraw(broken, { width: 1, height: 1 })).toBeNull()
    expect(exifForRedraw(broken, { width: 1, height: 1 }, 'as-is')).toBeNull()
    expect(exifForRedraw(new Uint8Array([1, 2, 3]), { width: 1, height: 1 })).toBeNull()

    const overflowing = buildExif(true)
    new DataView(overflowing.buffer, 6).setUint32(4, 5000, true)
    expect(exifForRedraw(overflowing, { width: 1, height: 1 })).toBeNull()
  })
})

describe('attachJpegExif', () => {
  it('inserts the block after JFIF and keeps the rest of the file byte for byte', async () => {
    const exif = buildExif(true)
    const plain = jpeg(JFIF)
    const out = new Uint8Array(await (await attachJpegExif(new Blob([plain]), exif))!.arrayBuffer())

    expect(out.length).toBe(plain.length + exif.length + 4)
    expect(readJpegExif(out)).toEqual(exif)
    expect([...out.subarray(0, 2 + JFIF.length)]).toEqual([...plain.subarray(0, 2 + JFIF.length)])
    expect([...out.subarray(out.length - TAIL.length)]).toEqual(TAIL)
  })

  it('refuses a non-JPEG and a block too large for one segment', async () => {
    expect(await attachJpegExif(new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])]), buildExif(true))).toBeNull()
    expect(await attachJpegExif(new Blob([jpeg(JFIF)]), new Uint8Array(0xffff))).toBeNull()
  })
})
