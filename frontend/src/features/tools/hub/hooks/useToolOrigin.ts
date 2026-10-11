import { useLocation } from 'react-router-dom'

interface ToolOrigin { pathname: string; search: string; scrollTop: number }
const CATALOG_PATHS = new Set(['/cong-cu', '/tai-lieu-pdf', '/xay-dung', '/gia-dinh'])

export function readToolOrigin(state: unknown): ToolOrigin | null {
  if (!state || typeof state !== 'object' || !('toolOrigin' in state)) return null
  const origin = state.toolOrigin as Partial<ToolOrigin> | null
  if (!origin || !CATALOG_PATHS.has(origin.pathname ?? '') || typeof origin.search !== 'string' || (origin.search && !origin.search.startsWith('?'))) return null
  return { pathname: origin.pathname!, search: origin.search, scrollTop: typeof origin.scrollTop === 'number' && Number.isFinite(origin.scrollTop) ? Math.max(0, origin.scrollTop) : 0 }
}

export function useToolOrigin() {
  const location = useLocation()
  const origin = readToolOrigin(location.state)
  return {
    backTo: origin ? `${origin.pathname}${origin.search}` : '/cong-cu',
    backState: origin ? { catalogScroll: origin.scrollTop } : null,
    capture: () => ({ toolOrigin: CATALOG_PATHS.has(location.pathname)
      ? { pathname: location.pathname, search: location.search, scrollTop: document.querySelector('.erp-tools-guest')?.scrollTop ?? 0 }
      : origin }),
  }
}
