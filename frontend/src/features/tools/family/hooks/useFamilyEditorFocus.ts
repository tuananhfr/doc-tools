import { useEffect, useRef } from 'react'

export function useFamilyEditorFocus(editing: boolean, view: string) {
  const workspace = useRef<HTMLDivElement>(null)
  const previous = useRef({ editing, view })

  useEffect(() => {
    const closed = previous.current.editing && !editing && previous.current.view === view
    previous.current = { editing, view }
    if (!closed) return

    const selector = view === 'calendar' ? '.cn-cal-side .cn-cal-panel' : '.cn-family-agenda'
    const target = workspace.current?.querySelector<HTMLElement>(selector)
    if (!target) return
    target.tabIndex = -1
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'start' })
  }, [editing, view])

  return workspace
}
