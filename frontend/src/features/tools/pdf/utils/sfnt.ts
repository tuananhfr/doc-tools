/** Vài con số trong tệp phông TrueType/OpenType đủ để quyết định có nhúng được và đặt chân chữ ở đâu. */
export interface SfntInfo {
  /** Giấy phép của phông cho nhúng vào tài liệu (OS/2 fsType). */
  embeddable: boolean
  /** Đầu / đuôi dòng theo cỡ chữ = 1 — cùng cặp số trình duyệt dùng để đặt dòng trong ô gõ. */
  ascent: number
  descent: number
}

const RESTRICTED = 0x0002
const PREVIEW_OR_EDIT = 0x000c
const BITMAP_ONLY = 0x0200
const USE_TYPO_METRICS = 0x0080

/**
 * Đọc bảng `head` / `hhea` / `OS/2`. Trả null với tệp gộp nhiều phông (.ttc) hay
 * tệp hỏng — nơi gọi rơi về phông đóng sẵn thay vì nhúng nhầm mặt phông.
 */
export function readSfnt(bytes: ArrayBuffer): SfntInfo | null {
  const view = new DataView(bytes)
  if (view.byteLength < 12) return null
  const tag = view.getUint32(0)
  // 0x00010000 = TrueType, 'OTTO' = OpenType CFF, 'true' = TrueType của Apple.
  if (tag !== 0x00010000 && tag !== 0x4f54544f && tag !== 0x74727565) return null

  const tables = new Map<string, number>()
  const count = view.getUint16(4)
  for (let index = 0; index < count; index++) {
    const entry = 12 + index * 16
    if (entry + 16 > view.byteLength) return null
    const name = String.fromCharCode(view.getUint8(entry), view.getUint8(entry + 1), view.getUint8(entry + 2), view.getUint8(entry + 3))
    tables.set(name, view.getUint32(entry + 8))
  }
  const head = tables.get('head')
  const hhea = tables.get('hhea')
  if (head === undefined || hhea === undefined || hhea + 8 > view.byteLength || head + 20 > view.byteLength) return null

  const unitsPerEm = view.getUint16(head + 18)
  if (!unitsPerEm) return null
  let ascent = view.getInt16(hhea + 4)
  let descent = -view.getInt16(hhea + 6)
  let embeddable = true

  const os2 = tables.get('OS/2')
  if (os2 !== undefined && os2 + 72 <= view.byteLength) {
    const fsType = view.getUint16(os2 + 8)
    embeddable = !(fsType & BITMAP_ONLY) && (!(fsType & RESTRICTED) || Boolean(fsType & PREVIEW_OR_EDIT))
    if (view.getUint16(os2 + 62) & USE_TYPO_METRICS) {
      ascent = view.getInt16(os2 + 68)
      descent = -view.getInt16(os2 + 70)
    }
  }
  return { embeddable, ascent: ascent / unitsPerEm, descent: descent / unitsPerEm }
}
