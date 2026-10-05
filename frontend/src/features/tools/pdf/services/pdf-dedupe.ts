import { PDFArray, PDFDict, PDFName, PDFRawStream, PDFRef, PDFStream, type PDFDocument, type PDFObject } from 'pdf-lib'

/**
 * Gộp các đối tượng giống hệt nhau trước khi lưu tệp. Trang đã cắt hay đã sửa
 * chữ là một tệp một trang riêng, mang theo bản phông / ảnh mà nó dùng chung với
 * các trang khác — chép vào tệp ra là mỗi bản thành một đối tượng, tệp Word
 * 555 KB thành 952 KB sau MỘT lần sửa chữ.
 *
 * Chỉ gộp thứ không mang danh tính: stream (dữ liệu bất biến), từ điển phông và
 * các mảng / từ điển con của phông. Trang, annotation, ô form, layer giống nhau
 * từng chữ vẫn là hai vật khác nhau — gộp chúng là sửa một chỗ đổi cả hai.
 */

export interface DedupeStats {
  objects: number
  /** Dữ liệu stream bớt được (byte, chưa kể phần đầu đối tượng). */
  bytes: number
}

const TYPE = PDFName.of('Type')
const LENGTH = PDFName.of('Length')
const SHARED_TYPES = new Set(['/Font', '/FontDescriptor', '/Encoding'])
// Phông Type0 của Word: Font → mảng DescendantFonts → CIDFont → FontDescriptor → FontFile2, mỗi vòng gộp được một tầng.
const MAX_ROUNDS = 8

function typeOf(dict: PDFDict): string | null {
  const type = dict.get(TYPE)
  return type instanceof PDFName ? type.toString() : null
}

function hashBytes(bytes: Uint8Array): number {
  let hash = 2166136261
  for (let index = 0; index < bytes.length; index++) hash = Math.imul(hash ^ bytes[index], 16777619)
  return hash >>> 0
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  for (let index = 0; index < a.length; index++) if (a[index] !== b[index]) return false
  return true
}

/**
 * Gộp đối tượng trùng trong `doc`, trỏ mọi tham chiếu về bản giữ lại. Gọi ngay
 * trước `save()` — sau bước này hai trang có thể dùng chung một đối tượng phông,
 * sửa tiếp trên `doc` là sửa cả hai.
 */
export function dedupeObjects(doc: PDFDocument): DedupeStats {
  const { context } = doc
  const objects = context.enumerateIndirectObjects()
  const replaced = new Map<PDFRef, PDFRef>()
  const canon = (ref: PDFRef): PDFRef => {
    let current = ref
    for (let next = replaced.get(current); next; next = replaced.get(current)) current = next
    return current
  }

  const signature = (value: PDFObject, skip?: PDFName): string | null => {
    if (value instanceof PDFRef) return canon(value).tag
    if (value instanceof PDFStream) return null
    if (value instanceof PDFArray) {
      const items = value.asArray().map((item) => signature(item))
      return items.includes(null) ? null : `[${items.join(' ')}]`
    }
    if (value instanceof PDFDict) {
      const entries: string[] = []
      for (const [key, item] of value.entries()) {
        if (key === skip) continue
        const part = signature(item)
        if (part === null) return null
        entries.push(`${key.toString()} ${part}`)
      }
      return `<<${entries.sort().join(' ')}>>`
    }
    return value.toString()
  }

  // Mảng và từ điển không có /Type chỉ gộp khi là của phông (W, DescendantFonts, CIDSystemInfo): mảng /Annots rỗng
  // của hai trang cũng "giống hệt nhau", gộp lại là thêm ghi chú vào trang này hiện ở cả trang kia.
  const fontParts = new Set<PDFRef>()
  for (const [, object] of objects) {
    if (!(object instanceof PDFDict) || !SHARED_TYPES.has(typeOf(object) ?? '')) continue
    for (const [, value] of object.entries()) {
      if (!(value instanceof PDFRef)) continue
      const target = context.lookup(value)
      if (target instanceof PDFArray || (target instanceof PDFDict && typeOf(target) === null)) fontParts.add(value)
    }
  }

  // Băm cả trăm MB ảnh chỉ để biết chúng khác nhau là phí: stream có độ dài không trùng với ai thì chắc chắn không trùng.
  const lengths = new Map<number, number>()
  for (const [, object] of objects) {
    if (object instanceof PDFRawStream) lengths.set(object.contents.length, (lengths.get(object.contents.length) ?? 0) + 1)
  }
  const hashes = new Map<PDFRawStream, number>()
  const contentKey = (stream: PDFRawStream) => {
    let hash = hashes.get(stream)
    if (hash === undefined) hashes.set(stream, (hash = hashBytes(stream.contents)))
    return `${stream.contents.length}:${hash}`
  }

  const keyOf = (ref: PDFRef, object: PDFObject): string | null => {
    if (object instanceof PDFRawStream) {
      if ((lengths.get(object.contents.length) ?? 0) < 2) return null
      // /Length có thể là tham chiếu riêng của từng bản; nội dung đã so bằng byte nên bỏ nó khỏi khoá.
      const dict = signature(object.dict, LENGTH)
      return dict === null ? null : `S ${contentKey(object)} ${dict}`
    }
    if (object instanceof PDFDict && (SHARED_TYPES.has(typeOf(object) ?? '') || fontParts.has(ref))) return signature(object)
    if (object instanceof PDFArray && fontParts.has(ref)) return signature(object)
    return null
  }

  const stats: DedupeStats = { objects: 0, bytes: 0 }
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const seen = new Map<string, [PDFRef, PDFObject]>()
    let merged = 0
    for (const [ref, object] of objects) {
      if (replaced.has(ref)) continue
      const key = keyOf(ref, object)
      if (key === null) continue
      const kept = seen.get(key)
      if (!kept) {
        seen.set(key, [ref, object])
        continue
      }
      if (object instanceof PDFRawStream) {
        if (!(kept[1] instanceof PDFRawStream) || !sameBytes(kept[1].contents, object.contents)) continue
        stats.bytes += object.contents.length
      }
      replaced.set(ref, kept[0])
      merged++
    }
    stats.objects += merged
    if (merged === 0) break
  }
  if (replaced.size === 0) return stats

  const repoint = (value: PDFObject) => {
    if (value instanceof PDFArray) {
      value.asArray().forEach((item, index) => {
        if (item instanceof PDFRef) {
          if (replaced.has(item)) value.set(index, canon(item))
        } else repoint(item)
      })
    } else if (value instanceof PDFDict) {
      for (const [key, item] of value.entries()) {
        if (item instanceof PDFRef) {
          if (replaced.has(item)) value.set(key, canon(item))
        } else repoint(item)
      }
    } else if (value instanceof PDFStream) {
      repoint(value.dict)
    }
  }
  for (const [ref, object] of objects) {
    if (replaced.has(ref)) context.delete(ref)
    else repoint(object)
  }
  return stats
}
