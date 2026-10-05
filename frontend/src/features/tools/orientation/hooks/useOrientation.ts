import { useCallback, useMemo, useReducer } from 'react'
import type { Size } from '../types/orientation.types'
import { startHistory, withHistory } from '../utils/history'
import { initialOrientation, isUntracked, orientationReducer, type OrientationAction } from '../utils/orientation-state'

const reducer = withHistory(orientationReducer, isUntracked)

/** Trạng thái đo + hoàn tác / làm lại cho mọi bước (spec v1.1 §4). Chỉ nằm trong RAM. */
export function useOrientation() {
  const [history, send] = useReducer(reducer, null, () => startHistory(initialOrientation(null)))

  const dispatch = useCallback((action: OrientationAction) => send({ type: 'do', action }), [])
  /** Gọi một lần lúc BẮT ĐẦU kéo — hoàn tác về đúng chỗ trước khi kéo. */
  const checkpoint = useCallback(() => send({ type: 'checkpoint' }), [])
  const undo = useCallback(() => send({ type: 'undo' }), [])
  const redo = useCallback(() => send({ type: 'redo' }), [])
  /** Nguồn mới: bắt đầu lại, giữ chế độ xem; ngăn hoàn tác cũng xoá theo. */
  const reset = useCallback(
    (size: Size | null) => send({ type: 'restart', present: orientationReducer(history.present, { type: 'reset', size }) }),
    [history.present],
  )

  return useMemo(
    () => ({
      state: history.present,
      dispatch,
      checkpoint,
      undo,
      redo,
      reset,
      canUndo: history.past.length > 0,
      canRedo: history.future.length > 0,
    }),
    [history, dispatch, checkpoint, undo, redo, reset],
  )
}

export type Orientation = ReturnType<typeof useOrientation>
