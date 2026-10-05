import { useCallback, useEffect, useState } from 'react'
import type { SourceFile } from '../types/doc-tools.types'
import { probeReflow, type ReflowProbe } from '../services/text-reflow'

type ProbeStatus = 'checking' | 'ready' | 'unavailable'

/**
 * Trang này sửa chữ có VIẾT LẠI được không. Chỉ dò khi cần (`enabled`) — lần
 * đầu phải tải PDFium. Lỗi dò = coi như không viết lại được, vẫn sửa trên bề mặt.
 */
export function useReflowProbe(source: SourceFile, pageIndex: number, enabled: boolean) {
  const key = `${source.id}:${pageIndex}`
  const [state, setState] = useState<{ key: string; ready: boolean } | null>(null)

  const load = useCallback(
    (): Promise<ReflowProbe | null> => (source.kind === 'pdf' ? probeReflow(source, pageIndex).catch(() => null) : Promise.resolve(null)),
    [source, pageIndex],
  )

  useEffect(() => {
    if (!enabled) return
    let alive = true
    void load().then((probe) => {
      if (alive) setState({ key, ready: probe !== null })
    })
    return () => {
      alive = false
    }
  }, [enabled, key, load])

  const status: ProbeStatus = state?.key !== key ? 'checking' : state.ready ? 'ready' : 'unavailable'
  return { status, load }
}
