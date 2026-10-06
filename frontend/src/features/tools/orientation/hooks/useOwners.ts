import { useMemo, useState } from 'react'
import type { StarSegment } from '../utils/compass-geometry'
import { starSegments } from '../utils/compass-view'
import { blankOwner, readOwner, type OwnerDraft } from '../utils/owner'

/** Spec v1.1 §13: so tối đa hai người (vợ chồng) — nhiều hơn là bảng rối, không ai đọc. */
export const MAX_OWNERS = 2

/**
 * Gia chủ đang xem theo tuổi. Nằm ở trang chứ không ở panel vì người ĐẦU TIÊN quyết
 * định vòng sao trên mặt la bàn. Không lưu, không gửi đi đâu.
 */
export function useOwners() {
  const [open, setOpen] = useState(false)
  const [drafts, setDrafts] = useState<OwnerDraft[]>([blankOwner(1)])
  const readings = useMemo(() => drafts.map((draft) => readOwner(draft)), [drafts])

  const first = readings[0]
  const stars: StarSegment[] | null = useMemo(() => (open && first?.ok ? starSegments(first.reading) : null), [open, first])

  return {
    open,
    setOpen,
    drafts,
    readings,
    stars,
    patch: (id: string, change: Partial<OwnerDraft>) => setDrafts((list) => list.map((draft) => (draft.id === id ? { ...draft, ...change } : draft))),
    add: () => setDrafts((list) => (list.length >= MAX_OWNERS ? list : [...list, blankOwner(list.some((item) => item.id === 'p2') ? 1 : 2)])),
    remove: (id: string) => setDrafts((list) => (list.length > 1 ? list.filter((draft) => draft.id !== id) : list)),
  }
}

export type Owners = ReturnType<typeof useOwners>
