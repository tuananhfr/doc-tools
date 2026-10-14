import { useEffect, useRef, type FocusEvent, type KeyboardEvent } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import type { WorkspaceTabLink } from '../utils/workspace-tabs'

export function WorkspaceTabs({ label, tabs }: { label: string; tabs: readonly WorkspaceTabLink[] }) {
  const menu = useRef<HTMLDetailsElement>(null)
  const currentId = tabs.find(tab => tab.current)?.toolId
  useEffect(() => { if (menu.current) menu.current.open = false }, [currentId])
  const close = () => { if (menu.current) menu.current.open = false }
  const blur = (event: FocusEvent<HTMLDetailsElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close()
  }
  const escape = (event: KeyboardEvent<HTMLDetailsElement>) => {
    if (event.key !== 'Escape') return
    event.stopPropagation()
    close()
    menu.current?.querySelector('summary')?.focus()
  }
  return <details ref={menu} className="cn-workspace-switcher" onBlur={blur} onKeyDown={escape}>
    <summary title={label} aria-label={label}><Icon name="grid" /><span>{label}</span><Icon name="chevron-down" /></summary>
    <nav className="cn-workspace-switcher__links" aria-label={label}>
      {tabs.map(tab => <Link key={tab.toolId} to={tab.to} onClick={close} aria-current={tab.current ? 'page' : undefined}><Icon name={tab.icon} /><span>{tab.name}</span></Link>)}
    </nav>
  </details>
}
