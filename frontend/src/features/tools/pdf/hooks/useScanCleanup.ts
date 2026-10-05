import { useCallback, useMemo, useRef, useState } from 'react'
import type { PageRef, SourceFile } from '../types/doc-tools.types'
import { scanPage } from '../services/scan-cleanup'
import { allChoices, choiceKey, groupScan, scanPlan, type ScanChoice, type ScanFix, type ScanItem } from '../utils/scan-plan'
import { createPacer } from '../utils/work-step'

type Phase = 'analyzing' | 'ready' | 'applying'

/**
 * Soi bản scan rồi để người dùng chọn sửa gì. Soi tuần tự từng trang (nhường
 * luồng chính giữa chừng) để thanh tiến độ chạy và nút Huỷ bấm được.
 */
export function useScanCleanup(cleanScan: (remove: string[], fixes: ReadonlyMap<string, ScanFix>) => Promise<number>) {
  const [phase, setPhase] = useState<Phase | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [items, setItems] = useState<ScanItem[]>([])
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set())
  const [failed, setFailed] = useState(0)
  const abort = useRef<AbortController | null>(null)

  const start = useCallback(async (targets: PageRef[], positions: ReadonlyMap<string, number>, sources: Record<string, SourceFile>) => {
    abort.current?.abort()
    const controller = new AbortController()
    abort.current = controller
    setPhase('analyzing')
    setItems([])
    setFailed(0)
    setProgress({ done: 0, total: targets.length })
    const pace = createPacer()
    const found: ScanItem[] = []
    let errors = 0
    try {
      for (const [index, page] of targets.entries()) {
        await pace(controller.signal)
        const source = sources[page.sourceId]
        try {
          const scan = source ? await scanPage(source, page) : null
          if (scan) found.push({ page, position: positions.get(page.id) ?? index + 1, scan })
        } catch {
          // Một trang hỏng (ảnh lỗi, PDF vỡ một trang) không được chặn cả lượt soi.
          errors++
        }
        setProgress({ done: index + 1, total: targets.length })
      }
    } catch (error) {
      if (controller.signal.aborted) return
      throw error
    }
    if (controller.signal.aborted) return
    setItems(found)
    setFailed(errors)
    setChosen(allChoices(groupScan(found, targets.length - errors)))
    setPhase('ready')
  }, [])

  const close = useCallback(() => {
    abort.current?.abort()
    abort.current = null
    setPhase(null)
    setItems([])
  }, [])

  const toggle = useCallback((id: string, choice: ScanChoice) => {
    setChosen((current) => {
      const next = new Set(current)
      const entry = choiceKey(id, choice)
      if (!next.delete(entry)) next.add(entry)
      return next
    })
  }, [])

  const isChosen = useCallback((id: string, choice: ScanChoice) => chosen.has(choiceKey(id, choice)), [chosen])

  const groups = useMemo(() => groupScan(items, progress.total - failed), [items, progress.total, failed])

  const plan = useMemo(() => scanPlan(groups, chosen), [groups, chosen])

  const apply = useCallback(async () => {
    setPhase('applying')
    try {
      return await cleanScan(plan.remove, plan.fixes)
    } finally {
      setPhase(null)
      setItems([])
    }
  }, [cleanScan, plan])

  return { phase, progress, groups, failed, plan, isChosen, toggle, start, close, apply }
}

export type ScanCleanup = ReturnType<typeof useScanCleanup>
