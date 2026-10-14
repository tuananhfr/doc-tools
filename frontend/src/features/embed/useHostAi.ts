'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { AiErrorCode } from './embed-protocol'
import { hostAi } from './embed-state'
import { HostAiError, type HostAiRequest } from './host-ai'

export type HostAiState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; text: string }
  | { status: 'error'; code: AiErrorCode }

/** One turn at a time: a new run (or unmount) drops the previous turn's answer. */
export function useHostAi() {
  const [state, setState] = useState<HostAiState>({ status: 'idle' })
  const current = useRef<AbortController | null>(null)

  useEffect(() => () => current.current?.abort(), [])

  const run = useCallback((request: HostAiRequest) => {
    current.current?.abort()
    const controller = new AbortController()
    current.current = controller
    setState({ status: 'running' })
    hostAi.ask(request, controller.signal).then(
      (text) => {
        if (!controller.signal.aborted) setState({ status: 'done', text })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', code: error instanceof HostAiError ? error.code : 'failed' })
      },
    )
  }, [])

  return { state, run }
}
