import { useEffect, useRef, useState } from 'react'
import type { FlowTask } from '../types/flow.types'
import type { FlowRun } from './useFlowRun'

/** Run once per accepted input/settings revision. Cancel and failures wait for an explicit retry. */
export function useAutomaticFlow(run: FlowRun, key: string, ready: boolean, task: () => FlowTask, enabled = true) {
  const latest = useRef(task)
  const [pending, setPending] = useState(false)
  useEffect(() => { latest.current = task })
  useEffect(() => {
    if (!enabled) return
    run.reset()
    setPending(ready)
    if (!ready) return
    const timer = window.setTimeout(() => { setPending(false); void run.start(latest.current()) }, 250)
    return () => { window.clearTimeout(timer); run.reset() }
  }, [key, ready, enabled, run.start, run.reset])
  return pending
}
