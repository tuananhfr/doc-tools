import { originOf, type PageRef, type SourceFile } from '../types/doc-tools.types'
import { baseName } from './file-guard'

export interface BatchGroup {
  /** Tên tệp ra (không đuôi), đã khử trùng giữa các nhóm. */
  name: string
  pages: PageRef[]
}

/**
 * Gom trang theo tệp gốc người dùng đã thả vào, giữ thứ tự đang xếp. Trang
 * đã cắt / điền form / chỉnh nghiêng vẫn về đúng tệp của nó; trang gộp ảnh đi
 * theo ảnh đầu tiên trong trang.
 */
export function groupByOrigin(pages: PageRef[], sources: Record<string, SourceFile>): BatchGroup[] {
  const groups = new Map<string, { name: string; pages: PageRef[] }>()
  for (const page of pages) {
    const source = sources[page.sourceId]
    if (!source) continue
    const origin = originOf(source)
    let group = groups.get(origin)
    if (!group) {
      const original = sources[origin] ?? (source.kind === 'collage' ? source.parts[0]?.source : source) ?? source
      group = { name: baseName(original.name), pages: [] }
      groups.set(origin, group)
    }
    group.pages.push(page)
  }
  const used = new Map<string, number>()
  return [...groups.values()].map((group) => {
    const key = group.name.toLowerCase()
    const seen = used.get(key) ?? 0
    used.set(key, seen + 1)
    // Hai tệp cùng tên (thả từ hai thư mục) → giải nén ra không được đè lên nhau.
    return { name: seen === 0 ? group.name : `${group.name} (${seen + 1})`, pages: group.pages }
  })
}
