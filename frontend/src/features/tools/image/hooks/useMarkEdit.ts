import { useCallback, useState } from 'react'
import type { ImageItem } from '../types/image.types'
import type { MarkState } from '../types/mark.types'
import { INITIAL_MARK } from '../utils/mark'

/**
 * Khung che + dấu của ảnh ĐANG mở, gắn theo id ảnh: chọn ảnh khác là bắt đầu lại
 * (khung che của ảnh cũ đặt lên ảnh mới là che nhầm chỗ).
 */
export function useMarkEdit(item: ImageItem | null) {
  const [store, setStore] = useState<{ id: string; state: MarkState } | null>(null)

  const state = item ? (store?.id === item.id ? store.state : INITIAL_MARK) : null

  const update = useCallback(
    (change: (state: MarkState) => MarkState) => {
      if (!item) return
      setStore((current) => ({ id: item.id, state: change(current?.id === item.id ? current.state : INITIAL_MARK) }))
    },
    [item],
  )

  return { state, update }
}
