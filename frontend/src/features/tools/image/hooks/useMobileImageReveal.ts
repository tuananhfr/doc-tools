import { useEffect, useRef } from 'react'

/** Reveal an accepted image once on phones; edits, removals and desktop never move the page. */
export function useMobileImageReveal(ids: readonly string[], selector?: string) {
  const signature = JSON.stringify(ids)
  const previous = useRef(new Set<string>())
  useEffect(() => {
    const current: string[] = JSON.parse(signature)
    const added = current.some(id => !previous.current.has(id))
    previous.current = new Set(current)
    if (!added || !selector || !window.matchMedia('(max-width: 767px)').matches) return
    const frame = requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(selector)
      if (!target || !target.getClientRects().length) return
      target.scrollIntoView({ block: 'start', behavior: 'instant' })
    })
    return () => cancelAnimationFrame(frame)
  }, [signature, selector])
}
