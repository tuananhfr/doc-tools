import { useCallback, useEffect, useRef, useState } from 'react'
import type { FlowState, FlowTask } from '../types/flow.types'
import { describeError } from '../utils/tool-error'

const IDLE: FlowState = { phase: 'idle', error: null }

/** Máy trạng thái của một lượt chạy: chờ → đang chạy (tiến độ, huỷ được) → xong hoặc lỗi. */
export function useFlowRun() {
  const [state, setState] = useState<FlowState>(IDLE)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => () => controller.current?.abort(), [])

  const start = useCallback(async (task: FlowTask): Promise<boolean> => {
    const abort = new AbortController()
    controller.current = abort
    setState({ phase: 'running', progress: null })
    // Chỉ vẽ lại khi phần trăm hoặc nhãn đổi: tiến độ báo theo từng trang, 500 trang là 500 lần setState.
    let shown = ''
    try {
      const result = await task({
        signal: abort.signal,
        onProgress: (done, total, label) => {
          const key = `${total > 0 ? Math.floor((done / total) * 100) : 0}|${label ?? ''}`
          if (key === shown || abort.signal.aborted) return
          shown = key
          setState({ phase: 'running', progress: { done, total, label } })
        },
      })
      abort.signal.throwIfAborted()
      setState({ phase: 'done', result })
      return true
    } catch (error) {
      if (abort.signal.aborted) setState(IDLE)
      else setState({ phase: 'idle', error: describeError(error, 'Không xử lý được tệp. Thử lại.') })
      return false
    } finally {
      if (controller.current === abort) controller.current = null
    }
  }, [])

  const cancel = useCallback(() => controller.current?.abort(), [])

  /** Về bước chọn tệp — tệp đã chọn do công cụ giữ, không mất. */
  const reset = useCallback(() => {
    controller.current?.abort()
    setState(IDLE)
  }, [])

  return { state, start, cancel, reset }
}

export type FlowRun = ReturnType<typeof useFlowRun>
