import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { filterTools } from '@/features/tools/hub/utils/tool-lookup'
import { directoryGroup, directoryGroupTools, type DirectoryGroup } from '../utils/directory-groups'

export function useCatalogSearch() {
  const [params, setParams] = useSearchParams()
  const [hydrated, setHydrated] = useState(false)
  // The server router only knows the pathname; restore query filters after hydration.
  useEffect(() => { setHydrated(true) }, [])
  const requestedFilter = hydrated ? params.get('nhom') : null
  const filter = directoryGroup(requestedFilter)
  const keyword = hydrated && filter === 'all' ? params.get('q') ?? '' : ''
  const catalog = useToolCatalog()
  const showSoon = hydrated && params.get('sap-co') === '1'
  const matched = useMemo(() => filterTools(directoryGroupTools(catalog, filter), 'all', keyword), [catalog, filter, keyword])
  const tools = useMemo(() => matched.filter(tool => showSoon || tool.status === 'ready'), [matched, showSoon])
  const readyCount = matched.filter(tool => tool.status === 'ready').length
  const soonCount = matched.filter(tool => tool.status === 'soon').length
  const update = (key: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(key, value)
    else next.delete(key)
    return next
  }, { replace: true, preventScrollReset: true })

  return {
    filter, keyword, tools, readyCount, soonCount, showSoon, catalog,
    onShowSoon: (value: boolean) => update('sap-co', value ? '1' : ''),
    onFilter: (value: DirectoryGroup) => setParams(current => {
      const next = new URLSearchParams(current)
      if (value === 'all') next.delete('nhom')
      else next.set('nhom', value)
      next.delete('q')
      return next
    }, { replace: true, preventScrollReset: true }),
    onKeyword: (value: string) => update('q', value),
    reset: () => setParams((current) => { const next = new URLSearchParams(current); next.delete('q'); next.delete('nhom'); return next }, { replace: true }),
  }
}
