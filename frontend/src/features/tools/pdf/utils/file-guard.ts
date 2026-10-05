import { detectImageFormat } from '@/features/tools/shared'
import type { ImageMime } from '../types/doc-tools.types'

export type DetectedKind = { kind: 'pdf' } | { kind: 'image'; mime: ImageMime } | null

/**
 * Nhận dạng tệp bằng CHỮ KÝ byte đầu, không tin đuôi tên hay `File.type` (spec
 * 07 — "validate bằng signature + MIME"): `.pdf` đổi tên từ `.exe` vẫn có
 * `type` do trình duyệt đoán theo đuôi.
 */
export function detectKind(head: Uint8Array): DetectedKind {
  // Phía PDF chỉ nhúng được JPG và PNG; WebP phải bị từ chối như tệp lạ.
  const image = detectImageFormat(head)
  if (image === 'jpeg') return { kind: 'image', mime: 'image/jpeg' }
  if (image === 'png') return { kind: 'image', mime: 'image/png' }

  // Chuẩn PDF cho phép rác trước `%PDF-` (Acrobat chấp nhận trong 1024 byte đầu),
  // tệp xuất từ vài máy scan có đúng kiểu đó.
  const limit = Math.min(head.length, 1024) - 5
  for (let index = 0; index <= limit; index++) {
    if (
      head[index] === 0x25 &&
      head[index + 1] === 0x50 &&
      head[index + 2] === 0x44 &&
      head[index + 3] === 0x46 &&
      head[index + 4] === 0x2d
    ) {
      return { kind: 'pdf' }
    }
  }

  return null
}

/**
 * Tên tệp an toàn để tải về: bỏ ký tự cấm trên Windows/macOS và ký tự điều
 * khiển, GIỮ dấu tiếng Việt. Rỗng thì dùng `fallback`.
 */
export function sanitizeFileName(name: string, fallback = 'tai-lieu'): string {
  const cleaned = name
    .normalize('NFC')
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f<>:"/\\|?*]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 120)
    .trim()
  return cleaned || fallback
}

/** Bỏ đuôi `.pdf` / `.jpg`… để ghép tên tệp xuất. */
export function baseName(name: string): string {
  return name.replace(/\.[a-z0-9]{1,5}$/i, '')
}

/**
 * Hướng EXIF (1–8) của ảnh JPEG; 1 khi không có.
 *
 * Ảnh chụp điện thoại lưu điểm ảnh NẰM NGANG kèm cờ xoay trong EXIF. Trình
 * duyệt tự xoay khi hiển thị, nhưng `pdf-lib` nhúng thẳng điểm ảnh → trang PDF
 * ra nằm ngang (spec 09 — fixture "EXIF rotation").
 */
export function readJpegOrientation(bytes: Uint8Array): number {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1

  let offset = 2
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset)
    const size = view.getUint16(offset + 2)
    if ((marker & 0xff00) !== 0xff00 || size < 2) return 1

    // APP1 mang "Exif\0\0" + khối TIFF.
    if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
      return readTiffOrientation(view, offset + 10, offset + 2 + size)
    }
    // Hết phần header (SOS) mà chưa gặp EXIF.
    if (marker === 0xffda) return 1
    offset += 2 + size
  }
  return 1
}

function readTiffOrientation(view: DataView, tiff: number, end: number): number {
  if (tiff + 8 > end || end > view.byteLength) return 1
  const little = view.getUint16(tiff) === 0x4949
  const ifd = tiff + view.getUint32(tiff + 4, little)
  if (ifd + 2 > end) return 1

  const count = view.getUint16(ifd, little)
  for (let index = 0; index < count; index++) {
    const entry = ifd + 2 + index * 12
    if (entry + 12 > end) return 1
    if (view.getUint16(entry, little) === 0x0112) {
      const value = view.getUint16(entry + 8, little)
      return value >= 1 && value <= 8 ? value : 1
    }
  }
  return 1
}
