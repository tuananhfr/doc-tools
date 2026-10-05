import { useCallback, useState } from 'react'
import type { MeasureState } from '../types/measure.types'
import { INITIAL_MEASURE, measureReducer, type MeasureAction } from '../utils/measure-state'

/**
 * Số đo của ảnh ĐANG mở, gắn theo id ảnh: chọn ảnh khác là bắt đầu lại — toạ độ
 * và đoạn chuẩn của ảnh cũ không có nghĩa gì trên ảnh mới.
 */
export function useMeasure(imageId: string | null) {
  const [store, setStore] = useState<{ id: string | null; state: MeasureState }>({ id: null, state: INITIAL_MEASURE })

  const state = store.id === imageId ? store.state : INITIAL_MEASURE

  const dispatch = useCallback(
    (action: MeasureAction) => {
      setStore((current) => ({ id: imageId, state: measureReducer(current.id === imageId ? current.state : INITIAL_MEASURE, action) }))
    },
    [imageId],
  )

  return [state, dispatch] as const
}
