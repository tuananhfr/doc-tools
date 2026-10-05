import { describe, expect, it } from 'vitest'
import { detectImageFormat, isHeic, readImageSize } from './image-header'

const bytes = (...values: number[]) => new Uint8Array(values)
const text = (value: string) => Array.from(value, (char) => char.charCodeAt(0))
const u32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]
const le16 = (value: number) => [value & 0xff, (value >>> 8) & 0xff]
const le24 = (value: number) => [value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff]

const png = (width: number, height: number) => bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...u32(13), ...text('IHDR'), ...u32(width), ...u32(height), 8, 6, 0, 0, 0)

// SOI, APP1 (EXIF giả 6 byte), SOF0.
const jpeg = (width: number, height: number) =>
  bytes(0xff, 0xd8, 0xff, 0xe1, 0x00, 0x08, 1, 2, 3, 4, 5, 6, 0xff, 0xc0, 0x00, 0x11, 8, height >> 8, height & 0xff, width >> 8, width & 0xff, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0)

const webp = (chunk: string, body: number[]) => bytes(...text('RIFF'), 0, 0, 0, 0, ...text('WEBP'), ...text(chunk), 0, 0, 0, 0, ...body, ...new Array<number>(12).fill(0))

describe('detectImageFormat', () => {
  it('nhận ba định dạng theo chữ ký byte', () => {
    expect(detectImageFormat(png(1, 1))).toBe('png')
    expect(detectImageFormat(jpeg(1, 1))).toBe('jpeg')
    expect(detectImageFormat(webp('VP8X', [0, 0, 0, 0, ...le24(0), ...le24(0)]))).toBe('webp')
  })

  it('từ chối tệp khác dù mang đuôi ảnh', () => {
    expect(detectImageFormat(bytes(...text('%PDF-1.7')))).toBeNull()
    expect(detectImageFormat(bytes(...text('RIFF'), 0, 0, 0, 0, ...text('WAVE')))).toBeNull()
    expect(detectImageFormat(bytes())).toBeNull()
  })
})

describe('isHeic', () => {
  it('nhận ảnh HEIC của iPhone', () => {
    expect(isHeic(bytes(0, 0, 0, 0x18, ...text('ftypheic'), 0, 0, 0, 0))).toBe(true)
    expect(isHeic(bytes(0, 0, 0, 0x18, ...text('ftypmp42'), 0, 0, 0, 0))).toBe(false)
    expect(isHeic(jpeg(1, 1))).toBe(false)
  })
})

describe('readImageSize', () => {
  it('PNG: đọc IHDR', () => {
    expect(readImageSize(png(4032, 3024), 'png')).toEqual({ width: 4032, height: 3024 })
  })

  it('JPEG: bỏ qua khối EXIF rồi đọc SOF', () => {
    expect(readImageSize(jpeg(1920, 1080), 'jpeg')).toEqual({ width: 1920, height: 1080 })
  })

  it('JPEG: SOF nằm ngoài phần đã đọc thì trả null', () => {
    expect(readImageSize(jpeg(1920, 1080).subarray(0, 14), 'jpeg')).toBeNull()
  })

  it('WebP mất dữ liệu (VP8)', () => {
    const body = [0, 0, 0, 0x9d, 0x01, 0x2a, ...le16(800), ...le16(600)]
    expect(readImageSize(webp('VP8 ', body), 'webp')).toEqual({ width: 800, height: 600 })
  })

  it('WebP không mất dữ liệu (VP8L): rộng − 1 và cao − 1, mỗi số 14 bit', () => {
    const bits = (1280 - 1) | ((720 - 1) << 14)
    const body = [0x2f, bits & 0xff, (bits >>> 8) & 0xff, (bits >>> 16) & 0xff, (bits >>> 24) & 0xff]
    expect(readImageSize(webp('VP8L', body), 'webp')).toEqual({ width: 1280, height: 720 })
  })

  it('WebP mở rộng (VP8X): khung vẽ 24 bit', () => {
    const body = [0x10, 0, 0, 0, ...le24(5000 - 1), ...le24(70000 - 1)]
    expect(readImageSize(webp('VP8X', body), 'webp')).toEqual({ width: 5000, height: 70000 })
  })

  it('header hỏng thì trả null thay vì ném lỗi', () => {
    expect(readImageSize(bytes(0x89, 0x50), 'png')).toBeNull()
    expect(readImageSize(bytes(...text('RIFF')), 'webp')).toBeNull()
  })
})
