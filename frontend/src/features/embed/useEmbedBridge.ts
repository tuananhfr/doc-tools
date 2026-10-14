'use client'
import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/app.store'
import { acceptHostEvent, isEmbedPath } from './embed-protocol'
import { toEmbedPath } from './embed-mode'
import { hostAi, postToHost, setEmbedState, useEmbed } from './embed-state'

/** Mounted once in ToolsLayout: reports route changes to the host and applies host settings. */
export function useEmbedBridge(): void {
  const { pathname, search } = useLocation()
  const { host } = useEmbed()
  const path = toEmbedPath(pathname, search)
  const announced = useRef(false)

  // Registered before the first `ready` goes out (effects run in order), so `init` is never missed.
  useEffect(() => {
    if (!host) return
    const onMessage = (event: MessageEvent) => {
      const message = acceptHostEvent(event, host, window.parent)
      if (!message) return
      switch (message.type) {
        case 'init':
          useAppStore.getState().setTheme(message.payload.theme)
          setEmbedState({ capabilities: message.payload.capabilities })
          break
        case 'theme':
          useAppStore.getState().setTheme(message.payload.mode)
          break
        case 'ai-result':
          hostAi.settle(message.payload)
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [host])

  useEffect(() => {
    if (!host || !isEmbedPath(path)) return
    if (announced.current) {
      postToHost({ type: 'navigate', payload: { path } })
      return
    }
    announced.current = true
    postToHost({ type: 'ready', payload: { path, title: document.title } })
  }, [host, path])
}
