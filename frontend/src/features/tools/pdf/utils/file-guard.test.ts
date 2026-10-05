import { describe, expect, it } from 'vitest'
import { baseName, detectKind, readJpegOrientation, sanitizeFileName } from './file-guard'

const bytes = (...values: number[]) => new Uint8Array(values)
const ascii = (text: string) => new TextEncoder().encode(text)

describe('detectKind', () => {
  it('nhận PDF, JPEG, PNG theo chữ ký', () => {
    expect(detectKind(ascii('%PDF-1.7\n'))).toEqual({ kind: 'pdf' })
    expect(detectKind(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ kind: 'image', mime: 'image/jpeg' })
    expect(detectKind(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0))).toEqual({
      kind: 'image',
      mime: 'image/png',
    })
  })

  it('chấp nhận rác trước %PDF- trong 1024 byte đầu', () => {
    const head = new Uint8Array(600)
    head.set(ascii('%PDF-1.4'), 500)
    expect(detectKind(head)).toEqual({ kind: 'pdf' })
  })

  it('từ chối tệp khác dù tên có đuôi .pdf', () => {
    expect(detectKind(ascii('MZ\x90\x00'))).toBeNull()
    expect(detectKind(ascii('PK\x03\x04'))).toBeNull()
    expect(detectKind(new Uint8Array(0))).toBeNull()
    // WebP là ảnh hợp lệ với công cụ ảnh nhưng pdf-lib không nhúng được.
    expect(detectKind(ascii('RIFF\x10\x00\x00\x00WEBPVP8 '))).toBeNull()
  })
})

describe('sanitizeFileName', () => {
  it('giữ dấu tiếng Việt, bỏ ký tự cấm', () => {
    expect(sanitizeFileName('Biên bản: nghiệm thu/đợt 2?.pdf')).toBe('Biên bản nghiệm thu đợt 2 .pdf')
  })

  it('rỗng hoặc toàn dấu chấm thì dùng tên mặc định', () => {
    expect(sanitizeFileName('  ')).toBe('tai-lieu')
    expect(sanitizeFileName('...', 'x')).toBe('x')
  })

  it('bỏ đuôi', () => {
    expect(baseName('Hồ sơ thiết kế.PDF')).toBe('Hồ sơ thiết kế')
    expect(baseName('khong-duoi')).toBe('khong-duoi')
  })
})

describe('readJpegOrientation', () => {
  function jpegWithOrientation(value: number, little: boolean): Uint8Array {
    const tiff: number[] = little
      ? [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, value, 0x00, 0x00, 0x00, 0x00, 0x00]
      : [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, 0x00, 0x01, 0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, value, 0x00, 0x00]
    const payload = [...ascii('Exif\0\0'), ...tiff]
    const size = payload.length + 2
    return bytes(0xff, 0xd8, 0xff, 0xe1, size >> 8, size & 0xff, ...payload, 0xff, 0xda, 0x00, 0x02)
  }

  it('đọc được cả hai thứ tự byte', () => {
    expect(readJpegOrientation(jpegWithOrientation(6, true))).toBe(6)
    expect(readJpegOrientation(jpegWithOrientation(3, false))).toBe(3)
  })

  it('không có EXIF hoặc không phải JPEG thì là 1', () => {
    expect(readJpegOrientation(bytes(0xff, 0xd8, 0xff, 0xda, 0x00, 0x02))).toBe(1)
    expect(readJpegOrientation(ascii('%PDF-1.7'))).toBe(1)
  })
})
