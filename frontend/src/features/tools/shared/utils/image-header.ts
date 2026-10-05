/** Ba định dạng ảnh mọi công cụ nhận; khớp `ImageFormat` của feature ảnh. */
export type ImageKind = 'jpeg' | 'png' | 'webp'

interface Size {
  width: number
  height: number
}

/** Số byte đầu cần đọc: SOF của JPEG có thể nằm sau khối EXIF + ảnh xem trước nhúng vài trăm KB. */
export const HEADER_BYTES = 1024 * 1024

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset + length > bytes.length) return ''
  return String.fromCharCode(...bytes.subarray(offset, offset + length))
}

/**
 * Nhận dạng bằng CHỮ KÝ byte đầu, không tin đuôi tên hay `File.type` — trình
 * duyệt đoán `type` theo đuôi, tệp đổi tên vẫn lọt.
 */
export function detectImageFormat(head: Uint8Array): ImageKind | null {
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'jpeg'
  if (head.length >= PNG_SIGNATURE.length && PNG_SIGNATURE.every((byte, index) => head[index] === byte)) return 'png'
  if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 4) === 'WEBP') return 'webp'
  return null
}

/** Ảnh HEIC / HEIF (iPhone): nhận ra để nói đúng lý do, không phải để mở. */
export function isHeic(head: Uint8Array): boolean {
  if (ascii(head, 4, 4) !== 'ftyp') return false
  return ['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'mif1', 'msf1'].includes(ascii(head, 8, 4))
}

function jpegSize(view: DataView): Size | null {
  let offset = 2
  while (offset + 4 <= view.byteLength) {
    if (view.getUint8(offset) !== 0xff) return null
    const marker = view.getUint8(offset + 1)
    // Byte đệm 0xFF và marker đứng một mình (RSTn, TEM) không có độ dài.
    if (marker === 0xff) {
      offset++
      continue
    }
    if ((marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      offset += 2
      continue
    }
    const size = view.getUint16(offset + 2)
    if (size < 2) return null
    // SOF0–SOF15 trừ DHT (C4), JPG (C8), DAC (CC): độ chính xác(1) cao(2) rộng(2).
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (offset + 9 > view.byteLength) return null
      return { width: view.getUint16(offset + 7), height: view.getUint16(offset + 5) }
    }
    if (marker === 0xda) return null
    offset += 2 + size
  }
  return null
}

function webpSize(bytes: Uint8Array, view: DataView): Size | null {
  if (view.byteLength < 30) return null
  const chunk = ascii(bytes, 12, 4)
  // Bản mất dữ liệu: 3 byte thẻ khung, mã bắt đầu 9D 01 2A, rồi rộng / cao 14 bit.
  if (chunk === 'VP8 ') {
    if (view.getUint8(23) !== 0x9d || view.getUint8(24) !== 0x01 || view.getUint8(25) !== 0x2a) return null
    return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
  }
  // Bản không mất dữ liệu: byte ký 0x2F, rồi (rộng − 1) và (cao − 1) mỗi số 14 bit.
  if (chunk === 'VP8L') {
    if (view.getUint8(20) !== 0x2f) return null
    const bits = view.getUint32(21, true)
    return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
  }
  // Bản mở rộng (alpha, hoạt hình): khung vẽ (rộng − 1) và (cao − 1) mỗi số 24 bit.
  if (chunk === 'VP8X') {
    const read24 = (offset: number) => view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getUint8(offset + 2) << 16)
    return { width: read24(24) + 1, height: read24(27) + 1 }
  }
  return null
}

/**
 * Kích thước ảnh đọc từ header, KHÔNG giải mã: ảnh 200 triệu điểm ảnh làm sập
 * tab ngay lúc `createImageBitmap`, chặn sau khi giải mã là quá muộn. Chưa tính
 * hướng EXIF (rộng / cao có thể đổi chỗ) — chỉ dùng để chặn theo diện tích.
 * `null` khi header hỏng hoặc nằm ngoài phần đã đọc — để bước giải mã lên tiếng.
 */
export function readImageSize(bytes: Uint8Array, format: ImageKind): Size | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (format === 'png') {
    // Chữ ký 8 byte, rồi chunk đầu bắt buộc là IHDR: độ dài(4) "IHDR"(4) rộng(4) cao(4).
    if (view.byteLength < 24 || view.getUint32(12) !== 0x49484452) return null
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }
  return format === 'jpeg' ? jpegSize(view) : webpSize(bytes, view)
}
