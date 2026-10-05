import type { PageRef } from '../types/doc-tools.types'

/** Trạng thái của "Sắp xếp PDF": các trang đang giữ + bộ tệp mà chúng được dựng từ đó. */
export interface OrganizedPages {
  sourceIds: string[]
  pages: PageRef[]
}

export const NO_PAGES: OrganizedPages = { sourceIds: [], pages: [] }

interface PagedSource {
  source: { id: string }
  pages: PageRef[]
}

/**
 * Đồng bộ lưới trang với bộ tệp vừa đổi mà KHÔNG làm mất việc đã sắp: trang của
 * tệp còn lại giữ nguyên chỗ, góc xoay và trạng thái đã bỏ; tệp mới thêm nối
 * vào cuối; tệp bị gỡ thì trang của nó đi theo.
 */
export function syncOrganized(current: OrganizedPages, items: PagedSource[]): OrganizedPages {
  const sourceIds = items.map((item) => item.source.id)
  if (sourceIds.length === current.sourceIds.length && sourceIds.every((id, index) => id === current.sourceIds[index])) return current

  const alive = new Set(sourceIds)
  const known = new Set(current.sourceIds)
  return {
    sourceIds,
    pages: [...current.pages.filter((page) => alive.has(page.sourceId)), ...items.filter((item) => !known.has(item.source.id)).flatMap((item) => item.pages)],
  }
}

/** Lưới còn y như lúc nạp tệp: đủ trang, đúng thứ tự, chưa xoay trang nào. */
export function isUntouched(pages: PageRef[], items: PagedSource[]): boolean {
  const original = items.flatMap((item) => item.pages)
  return pages.length === original.length && pages.every((page, index) => page.id === original[index].id && page.rotation === original[index].rotation)
}
