import { useCallback, useState } from 'react'
import type { ImageItem, Rect } from '../types/image.types'
import { rectForAspect } from '../utils/crop-rect'

/**
 * Khung cắt ảnh thẻ, gắn theo (ảnh, tỉ lệ): đổi ảnh hoặc đổi cỡ ảnh thẻ là khung
 * nhảy về khung lớn nhất đúng tỉ lệ mới — khung 3 × 4 đang kéo không dùng lại
 * được cho ảnh 5 × 5.
 */
export function usePhotoCrop(item: ImageItem | null, aspect: number) {
  const [store, setStore] = useState<{ key: string; rect: Rect } | null>(null)
  const key = item ? `${item.id}:${aspect}` : null

  const rect = item ? (store?.key === key ? store.rect : rectForAspect(item, aspect)) : null

  const setRect = useCallback(
    (next: Rect) => {
      if (key) setStore({ key, rect: next })
    },
    [key],
  )

  return { rect, setRect, moved: store?.key === key }
}
