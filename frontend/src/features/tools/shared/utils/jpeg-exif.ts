/**
 * Mang khối EXIF (ngày chụp, toạ độ GPS, máy ảnh) của ảnh JPG gốc sang ảnh đã vẽ
 * lại. Canvas mã hoá ra JPEG trơn; với ảnh hiện trường, ngày chụp và vị trí là
 * bằng chứng nên không được mất chỉ vì người dùng nén hay cắt ảnh.
 *
 * Mọi hàm ở đây trả `null` / trả lại nguyên vẹn khi gặp cấu trúc lạ: thà ảnh ra
 * thiếu EXIF (và màn kết quả nói ra) còn hơn ghi một khối hỏng vào tệp.
 */

interface Size {
  width: number
  height: number
}

const APP0 = 0xe0
const APP1 = 0xe1
const SOS = 0xda
/** "Exif\0\0" — đứng đầu ruột của segment APP1 mang EXIF (APP1 còn dùng cho XMP). */
const EXIF_ID = [0x45, 0x78, 0x69, 0x66, 0x00, 0x00]
/** Độ dài segment ghi bằng 2 byte và tính cả chính 2 byte đó. */
const MAX_SEGMENT_PAYLOAD = 0xffff - 2

const TAG_ORIENTATION = 0x0112
const TAG_EXIF_IFD = 0x8769
const TAG_PIXEL_WIDTH = 0xa002
const TAG_PIXEL_HEIGHT = 0xa003
const TAG_THUMBNAIL_OFFSET = 0x0201
const TAG_THUMBNAIL_LENGTH = 0x0202
const TYPE_SHORT = 3
const TYPE_LONG = 4

function isExif(bytes: Uint8Array, offset: number): boolean {
  return EXIF_ID.every((byte, index) => bytes[offset + index] === byte)
}

/**
 * Ruột segment APP1 mang EXIF (kể cả "Exif\0\0"), đọc từ phần đầu tệp JPEG.
 * `null` khi không có, hoặc khi khối nằm ngoài phần `head` đã đọc.
 */
export function readJpegExif(head: Uint8Array): Uint8Array | null {
  if (head.length < 4 || head[0] !== 0xff || head[1] !== 0xd8) return null
  let offset = 2
  while (offset + 4 <= head.length) {
    if (head[offset] !== 0xff) return null
    const marker = head[offset + 1]
    if (marker === 0xff) {
      offset++
      continue
    }
    if (marker === SOS) return null
    const size = (head[offset + 2] << 8) | head[offset + 3]
    if (size < 2) return null
    const start = offset + 4
    const end = offset + 2 + size
    if (marker === APP1 && size >= 2 + EXIF_ID.length && isExif(head, start)) {
      return end <= head.length ? head.slice(start, end) : null
    }
    offset = end
  }
  return null
}

/**
 * Bản EXIF dùng cho ảnh ĐÃ vẽ lại ở kích thước `size`. Ba thứ trong khối gốc sẽ
 * nói sai về ảnh mới nên phải sửa:
 *  - cờ hướng: điểm ảnh đã được xoay đứng lúc giải mã, giữ cờ cũ là ảnh bị xoay hai lần
 *    (`orientation: 'as-is'` cho nơi giải mã KHÔNG áp cờ — ảnh nằm trong PDF);
 *  - ảnh xem trước nhúng: là ảnh TRƯỚC khi cắt — để lại thì phần vừa cắt bỏ vẫn nằm trong tệp;
 *  - kích thước điểm ảnh.
 * Không dời byte nào (ảnh xem trước bị ghi đè bằng 0 chứ không cắt đi): mọi
 * offset trong khối, kể cả của MakerNote, tính từ đầu khối TIFF.
 */
export function exifForRedraw(exif: Uint8Array, size: Size, orientation: 'upright' | 'as-is' = 'upright'): Uint8Array | null {
  const tiff = EXIF_ID.length
  if (exif.length < tiff + 8 || !isExif(exif, 0)) return null
  const out = exif.slice()
  const view = new DataView(out.buffer, out.byteOffset + tiff, out.byteLength - tiff)

  const order = view.getUint16(0)
  if (order !== 0x4949 && order !== 0x4d4d) return null
  const little = order === 0x4949
  if (view.getUint16(2, little) !== 42) return null

  /** Vị trí các entry của một IFD + chỗ ghi offset của IFD kế; `null` khi IFD tràn khỏi khối. */
  const directory = (offset: number): { entries: number[]; next: number } | null => {
    if (offset < 8 || offset + 2 > view.byteLength) return null
    const count = view.getUint16(offset, little)
    const next = offset + 2 + count * 12
    if (next + 4 > view.byteLength) return null
    return { entries: Array.from({ length: count }, (_, index) => offset + 2 + index * 12), next }
  }
  const tagOf = (entry: number) => view.getUint16(entry, little)
  const readValue = (entry: number): number | null => {
    const type = view.getUint16(entry + 2, little)
    if (type === TYPE_SHORT) return view.getUint16(entry + 8, little)
    return type === TYPE_LONG ? view.getUint32(entry + 8, little) : null
  }
  const writeValue = (entry: number, value: number) => {
    const type = view.getUint16(entry + 2, little)
    if (type === TYPE_SHORT && value <= 0xffff) view.setUint16(entry + 8, value, little)
    else if (type === TYPE_LONG) view.setUint32(entry + 8, value, little)
  }

  const main = directory(view.getUint32(4, little))
  if (!main) return null

  let exifIfd: number | null = null
  for (const entry of main.entries) {
    if (tagOf(entry) === TAG_ORIENTATION) {
      if (orientation === 'upright') writeValue(entry, 1)
    }
    else if (tagOf(entry) === TAG_EXIF_IFD) exifIfd = readValue(entry)
  }

  const detail = exifIfd === null ? null : directory(exifIfd)
  for (const entry of detail?.entries ?? []) {
    if (tagOf(entry) === TAG_PIXEL_WIDTH) writeValue(entry, size.width)
    else if (tagOf(entry) === TAG_PIXEL_HEIGHT) writeValue(entry, size.height)
  }

  const thumbnail = directory(view.getUint32(main.next, little))
  if (thumbnail) {
    let start: number | null = null
    let length: number | null = null
    for (const entry of thumbnail.entries) {
      if (tagOf(entry) === TAG_THUMBNAIL_OFFSET) start = readValue(entry)
      else if (tagOf(entry) === TAG_THUMBNAIL_LENGTH) length = readValue(entry)
    }
    if (start !== null && length !== null && start + length <= view.byteLength) out.fill(0, tiff + start, tiff + start + length)
  }
  // Gỡ IFD của ảnh xem trước khỏi chuỗi kể cả khi không định vị được dữ liệu của nó.
  view.setUint32(main.next, 0, little)

  return out
}

/** Chỗ chèn APP1: sau SOI và sau các APP0 (JFIF) mà bộ mã hoá của trình duyệt ghi sẵn. */
function insertOffset(head: Uint8Array): number | null {
  if (head.length < 4 || head[0] !== 0xff || head[1] !== 0xd8) return null
  let offset = 2
  while (offset + 4 <= head.length && head[offset] === 0xff && head[offset + 1] === APP0) {
    offset += 2 + ((head[offset + 2] << 8) | head[offset + 3])
  }
  return offset <= head.length ? offset : null
}

/** Chèn khối EXIF vào một tệp JPEG. Trả `null` khi tệp không phải JPEG hoặc khối quá lớn cho một segment. */
export async function attachJpegExif(jpeg: Blob, exif: Uint8Array): Promise<Blob | null> {
  if (exif.length > MAX_SEGMENT_PAYLOAD) return null
  const offset = insertOffset(new Uint8Array(await jpeg.slice(0, 4096).arrayBuffer()))
  if (offset === null) return null
  const size = exif.length + 2
  const header = new Uint8Array([0xff, APP1, size >> 8, size & 0xff])
  return new Blob([jpeg.slice(0, offset), header, exif.slice(), jpeg.slice(offset)], { type: 'image/jpeg' })
}
