import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { filterTools } from '@/features/tools/hub/utils/tool-lookup'
import { directoryGroup, directoryGroupTools, type DirectoryGroup } from '../utils/directory-groups'

export function useCatalogSearch() {
  const [params, setParams] = useSearchParams()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const pathGroup = directoryGroup(pathname.replace(/^\/|\/$/g, ''))
  const [hydrated, setHydrated] = useState(false)
  // The server router only knows the pathname; restore query filters after hydration.
  useEffect(() => { setHydrated(true) }, [])
  const requestedFilter = hydrated ? params.get('nhom') : null
  const filter = pathGroup !== 'all' ? pathGroup : directoryGroup(requestedFilter)
  useEffect(() => {
    if (!hydrated || pathGroup !== 'all' || filter === 'all') return
    const next = new URLSearchParams(params)
    next.delete('nhom'); next.delete('q')
    navigate({ pathname: '/' + filter, search: next.size ? '?' + next.toString() : '' }, { replace: true, preventScrollReset: true })
  }, [hydrated, pathGroup, filter, params, navigate])
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
    onFilter: (value: DirectoryGroup) => {
      const current = params
      const next = new URLSearchParams(current)
      next.delete('nhom')
      next.delete('q')
      navigate({ pathname: value === 'all' ? '/' : '/' + value, search: next.size ? '?' + next.toString() : '' }, { preventScrollReset: true })
    },
    onKeyword: (value: string) => update('q', value),
    reset: () => navigate('/', { replace: true }),
  }
}
