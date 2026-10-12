import { READ_POSITIONS_MAX } from '../config/read-listen'

type Entry = [fingerprint: string, position: { o: number; t: number }]

/** FNV-1a 32 bit + độ dài: đủ nhận lại cùng văn bản, không chứa và không dựng lại được chữ (spec v3 §07). */
export function textFingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `${(hash >>> 0).toString(16).padStart(8, '0')}-${text.length.toString(36)}`
}

/** Dữ liệu trong localStorage là dữ liệu lạ (người khác sửa tay, bản cũ): mục sai hình dạng bị bỏ. */
function entries(raw: string | null): Entry[] {
  try {
    const value = JSON.parse(raw ?? '') as { v?: unknown; items?: unknown } | null
    if (value?.v !== 1 || !value.items || typeof value.items !== 'object') return []
    return Object.entries(value.items as Record<string, unknown>).flatMap(([key, item]): Entry[] => {
      const { o, t } = (item ?? {}) as { o?: unknown; t?: unknown }
      return typeof o === 'number' && Number.isInteger(o) && o >= 0 && typeof t === 'number' ? [[key, { o, t }]] : []
    })
  } catch {
    return []
  }
}

/** Vị trí đã nhớ cho văn bản này; 0 coi như chưa đọc. */
export function recallPosition(raw: string | null, fingerprint: string): number | null {
  const offset = entries(raw).find(([key]) => key === fingerprint)?.[1].o
  return offset ? offset : null
}

export function rememberPosition(raw: string | null, fingerprint: string, offset: number, now: number, max = READ_POSITIONS_MAX): string {
  const kept = [[fingerprint, { o: offset, t: now }] as Entry, ...entries(raw).filter(([key]) => key !== fingerprint)]
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, max)
  return JSON.stringify({ v: 1, items: Object.fromEntries(kept) })
}
