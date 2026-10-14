import { useEffect, useRef, useState } from 'react'

export function useOfficeFullscreen(active: boolean) {
  const workspaceRef = useRef<HTMLElement>(null)
  const mounted = useRef(false)
  const ownsFullscreen = useRef(false)
  const pending = useRef(false)
  const wasActive = useRef(false)
  const [minimized, setMinimized] = useState(false)
  const [nativeFullscreen, setNativeFullscreen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const expanded = active && !minimized

  function hasFullscreen() {
    const element = document.fullscreenElement
    return Boolean(element && (
      (ownsFullscreen.current && element === document.documentElement)
      || workspaceRef.current?.contains(element)
    ))
  }

  async function exitNative() {
    if (!hasFullscreen()) return true
    try {
      await document.exitFullscreen()
      ownsFullscreen.current = false
      if (mounted.current) setNativeFullscreen(false)
      return true
    } catch {
      if (mounted.current) setUnavailable(true)
      return false
    }
  }

  useEffect(() => {
    mounted.current = true
    const sync = () => setNativeFullscreen(hasFullscreen())
    document.addEventListener('fullscreenchange', sync)
    return () => {
      mounted.current = false
      document.removeEventListener('fullscreenchange', sync)
      // Fullscreen the root so Bootstrap's body portals remain visible above the workspace.
      if (ownsFullscreen.current && document.fullscreenElement) void document.exitFullscreen().catch(() => {})
    }
  }, [])

  useEffect(() => {
    if (!expanded || !workspaceRef.current) return
    const workspace = workspaceRef.current
    const siblings = new Map<HTMLElement, boolean>()
    let branch: HTMLElement = workspace
    while (branch.parentElement) {
      const parent = branch.parentElement
      for (const sibling of parent.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          siblings.set(sibling, sibling.inert)
          sibling.inert = true
        }
      }
      if (parent === document.body) break
      branch = parent
    }
    workspace.querySelector<HTMLButtonElement>('[data-office-expand]')?.focus({ preventScroll: true })
    return () => {
      for (const [element, inert] of siblings) element.inert = inert
    }
  }, [expanded])

  useEffect(() => {
    if (!active && wasActive.current) workspaceRef.current?.querySelector<HTMLButtonElement>('[data-office-open]')?.focus({ preventScroll: true })
    wasActive.current = active
  }, [active])

  function expand() {
    setMinimized(false)
    setUnavailable(false)
  }

  async function minimize() {
    if (pending.current) return
    if (await exitNative() && mounted.current) {
      setMinimized(true)
      setUnavailable(false)
    }
  }

  async function toggleNative() {
    if (pending.current) return
    expand()
    if (hasFullscreen()) {
      await exitNative()
      return
    }
    if (!document.fullscreenEnabled || !document.documentElement.requestFullscreen) {
      setUnavailable(true)
      return
    }
    pending.current = true
    ownsFullscreen.current = true
    setBusy(true)
    try {
      await document.documentElement.requestFullscreen()
      if (mounted.current) setNativeFullscreen(hasFullscreen())
      else if (document.fullscreenElement) await document.exitFullscreen()
    } catch {
      ownsFullscreen.current = false
      if (mounted.current) setUnavailable(true)
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }

  function reset() {
    void exitNative()
    setMinimized(false)
    setUnavailable(false)
  }

  return { workspaceRef, expanded, nativeFullscreen, busy, unavailable, expand, minimize, toggleNative, reset }
}
