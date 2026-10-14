import { useEffect, useRef, useState } from 'react'
import { withBase } from '@/utils/url'
import { officeVendorPath, type OfficeAppId } from '../config/office-apps'
import { officeGraphicsSupported } from '../services/browser-support'

type EditorState = 'idle' | 'checking' | 'open' | 'unavailable' | 'unsupported'

export function useOfficeEditor(app: OfficeAppId) {
  const [state, setState] = useState<EditorState>('idle')
  const request = useRef<AbortController | null>(null)
  const src = withBase(officeVendorPath(app) + 'index.html')

  useEffect(() => () => request.current?.abort(), [])

  async function open() {
    if (!officeGraphicsSupported()) {
      setState('unsupported')
      return
    }
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState('checking')
    try {
      const response = await fetch(src, { signal: controller.signal, credentials: 'omit' })
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Editor unavailable')
      await response.text()
      if (!controller.signal.aborted) setState('open')
    } catch {
      if (!controller.signal.aborted) setState('unavailable')
    }
  }

  return { state, src, open, close: () => setState('idle') }
}
