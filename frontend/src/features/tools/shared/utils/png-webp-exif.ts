/**
 * EXIF trong PNG (chunk `eXIf`) và WebP (chunk `EXIF`). Cả hai chứa khối TIFF
 * trần; hàm đọc trả về dạng của JPEG ("Exif\0\0" + TIFF) để dùng chung
 * `exifForRedraw` / `attachJpegExif`.
 *
 * Hàm đọc cần CẢ tệp: `eXIf` được phép đứng sau dữ liệu ảnh, còn `EXIF` của
 * WebP thì luôn đứng sau.
 */

const EXIF_ID = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
/** Chữ ký + chunk IHDR (4 độ dài + 4 tên + 13 dữ liệu + 4 CRC): `eXIf` chèn ngay sau đó. */
const PNG_AFTER_IHDR = PNG_SIGNATURE.length + 25

function tag(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.subarray(offset, offset + 4))
}

function hasExifId(bytes: Uint8Array): boolean {
  return EXIF_ID.every((byte, index) => bytes[index] === byte)
}

function withExifId(tiff: Uint8Array): Uint8Array {
  const out = new Uint8Array(EXIF_ID.length + tiff.length)
  out.set(EXIF_ID)
  out.set(tiff, EXIF_ID.length)
  return out
}

export function readPngExif(file: Uint8Array): Uint8Array | null {
  if (!PNG_SIGNATURE.every((byte, index) => file[index] === byte)) return null
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength)
  let offset = PNG_SIGNATURE.length
  while (offset + 12 <= file.length) {
    const length = view.getUint32(offset)
    const name = tag(file, offset + 4)
    const start = offset + 8
    if (name === 'IEND') return null
    if (name === 'eXIf') return start + length <= file.length && length > 0 ? withExifId(file.subarray(start, start + length)) : null
    offset = start + length + 4
  }
  return null
}

export function readWebpExif(file: Uint8Array): Uint8Array | null {
  if (file.length < 12 || tag(file, 0) !== 'RIFF' || tag(file, 8) !== 'WEBP') return null
  const view = new DataView(file.buffer, file.byteOffset, file.byteLength)
  let offset = 12
  while (offset + 8 <= file.length) {
    const length = view.getUint32(offset + 4, true)
    const start = offset + 8
    if (tag(file, offset) === 'EXIF') {
      if (length === 0 || start + length > file.length) return null
      const data = file.subarray(start, start + length)
      // Một số bộ ghi (libwebp cũ, vài app điện thoại) chép luôn cả tiền tố của JPEG vào chunk.
      return hasExifId(data) ? data.slice() : withExifId(data)
    }
    // Chunk RIFF đệm cho chẵn byte.
    offset = start + length + (length & 1)
  }
  return null
}

let crcTable: Uint32Array | null = null

function crc32(parts: Uint8Array[]): number {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const part of parts) {
    for (const byte of part) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/** Chèn chunk `eXIf` vào một tệp PNG. `exif` ở dạng của JPEG ("Exif\0\0" + TIFF). `null` khi tệp không phải PNG. */
export async function attachPngExif(png: Blob, exif: Uint8Array): Promise<Blob | null> {
  if (!hasExifId(exif)) return null
  const head = new Uint8Array(await png.slice(0, PNG_AFTER_IHDR).arrayBuffer())
  if (head.length < PNG_AFTER_IHDR || !PNG_SIGNATURE.every((byte, index) => head[index] === byte) || tag(head, 12) !== 'IHDR') return null

  const tiff = exif.slice(EXIF_ID.length)
  const name = new Uint8Array([0x65, 0x58, 0x49, 0x66])
  const frame = new DataView(new ArrayBuffer(8))
  frame.setUint32(0, tiff.length)
  frame.setUint32(4, crc32([name, tiff]))
  const frameBytes = new Uint8Array(frame.buffer)
  return new Blob([png.slice(0, PNG_AFTER_IHDR), frameBytes.slice(0, 4), name, tiff, frameBytes.slice(4), png.slice(PNG_AFTER_IHDR)], { type: 'image/png' })
}
