import { useCallback, useState } from 'react'
import type { ImageItem } from '../types/image.types'
import { initialCrop, type CropState } from '../utils/crop-state'

/**
 * Trạng thái chỉnh của ảnh ĐANG mở, gắn theo id ảnh: chọn ảnh khác là bắt đầu
 * lại từ đầu mà không cần effect đặt lại (khung cắt của ảnh cũ áp lên ảnh mới
 * khác kích thước là ra khung thò ngoài ảnh).
 */
export function useCropEdit(item: ImageItem | null) {
  const [store, setStore] = useState<{ id: string; state: CropState } | null>(null)

  const state = item ? (store?.id === item.id ? store.state : initialCrop(item)) : null

  const update = useCallback(
    (change: (state: CropState) => CropState) => {
      if (!item) return
      setStore((current) => ({ id: item.id, state: change(current?.id === item.id ? current.state : initialCrop(item)) }))
    },
    [item],
  )

  const reset = useCallback(() => setStore(null), [])

  return { state, update, reset }
}
