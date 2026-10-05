import { useCallback, useState } from 'react'
import type { PageRef } from '../types/doc-tools.types'
import { isUntouched, NO_PAGES, syncOrganized, type OrganizedPages } from '../utils/organize'
import { deletePages, rotatePages, shiftPage } from '../utils/page-ops'
import type { QuickItem } from './useQuickSources'

/**
 * Lưới trang của "Sắp xếp PDF": thứ tự, góc xoay và trang đã bỏ sống ở đây chứ
 * không trong `useQuickSources` — thêm / gỡ tệp không được xoá việc đã sắp.
 */
export function useOrganizePages(items: QuickItem[]) {
  const [state, setState] = useState<OrganizedPages>(NO_PAGES)
  // Bộ tệp đổi thì chỉnh state ngay trong lượt render này (không qua effect) — lưới không nháy một nhịp với trang của bộ tệp cũ.
  const synced = syncOrganized(state, items)
  if (synced !== state) setState(synced)

  const change = useCallback((apply: (pages: PageRef[]) => PageRef[]) => setState((current) => ({ ...current, pages: apply(current.pages) })), [])

  const shift = useCallback((id: string, delta: -1 | 1) => change((pages) => shiftPage(pages, id, delta)), [change])
  const rotate = useCallback((id: string) => change((pages) => rotatePages(pages, [id], 90)), [change])
  const remove = useCallback((id: string) => change((pages) => deletePages(pages, [id])), [change])
  const reset = () => setState({ sourceIds: items.map((item) => item.source.id), pages: items.flatMap((item) => item.pages) })

  return { pages: synced.pages, untouched: isUntouched(synced.pages, items), shift, rotate, remove, reset }
}

export type OrganizePages = ReturnType<typeof useOrganizePages>
