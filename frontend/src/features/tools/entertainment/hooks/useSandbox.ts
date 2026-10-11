import { useEffect, useState } from 'react'
import { sandboxState } from '../services/entertainment.api'

export function useSandbox() {
  const [state, setState] = useState<'loading' | 'enabled' | 'disabled' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController(); setState('loading')
    if (process.env.NEXT_PUBLIC_ENT_SANDBOX !== '1') { setState('disabled'); return () => controller.abort() }
    void sandboxState(controller.signal).then(value => { if (!controller.signal.aborted) setState(value.sandbox_enabled ? 'enabled' : 'disabled') }).catch(() => { if (!controller.signal.aborted) setState('error') })
    return () => controller.abort()
  }, [retry])
  return { state, retry: () => setRetry(value => value + 1) }
}
