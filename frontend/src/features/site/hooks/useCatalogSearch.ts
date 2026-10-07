import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TOOL_FILTERS } from '@/features/tools/hub/config/tool-catalog'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import type { ToolFilter } from '@/features/tools/hub/types/tool.types'
import { filterTools } from '@/features/tools/hub/utils/tool-lookup'

export function useCatalogSearch() {
  const [params, setParams] = useSearchParams()
  const [hydrated, setHydrated] = useState(false)
  // The server router only knows the pathname; restore query filters after hydration.
  useEffect(() => { setHydrated(true) }, [])
  const requestedFilter = hydrated ? params.get('nhom') : null
  const filter = TOOL_FILTERS.find((item) => item === requestedFilter) ?? 'all'
  const keyword = hydrated ? params.get('q') ?? '' : ''
  const catalog = useToolCatalog()
  const tools = useMemo(() => filterTools(catalog, filter, keyword), [catalog, filter, keyword])
  const update = (key: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(key, value)
    else next.delete(key)
    return next
  }, { replace: true, preventScrollReset: true })

  return {
    filter, keyword, tools,
    onFilter: (value: ToolFilter) => update('nhom', value === 'all' ? '' : value),
    onKeyword: (value: string) => update('q', value),
    reset: () => setParams((current) => { const next = new URLSearchParams(current); next.delete('q'); next.delete('nhom'); return next }, { replace: true }),
  }
}
