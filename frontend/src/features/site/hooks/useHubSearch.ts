import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchHubTools, type HubTools } from '../utils/hub-tools'

export const ALL_SUBGROUPS = 'all'

export function useHubSearch(hub: HubTools) {
  const [params, setParams] = useSearchParams()
  const [hydrated, setHydrated] = useState(false)
  // Router phía máy chủ chỉ biết pathname; đọc query sau hydrate để HTML tĩnh khớp lần vẽ đầu.
  useEffect(() => { setHydrated(true) }, [])
  const requested = hydrated ? params.get('nhom') : null
  const groupId = hub.groups.find((group) => group.id === requested)?.id ?? ALL_SUBGROUPS
  const keyword = hydrated ? params.get('q') ?? '' : ''
  const tools = useMemo(() => searchHubTools(hub, groupId, keyword), [hub, groupId, keyword])
  const update = (key: string, value: string) => setParams((current) => {
    const next = new URLSearchParams(current)
    if (value) next.set(key, value)
    else next.delete(key)
    return next
  }, { replace: true, preventScrollReset: true })

  return {
    groupId, keyword, tools,
    onGroup: (value: string) => update('nhom', value === ALL_SUBGROUPS ? '' : value),
    onKeyword: (value: string) => update('q', value),
    reset: () => setParams((current) => { const next = new URLSearchParams(current); next.delete('q'); next.delete('nhom'); return next }, { replace: true, preventScrollReset: true }),
  }
}
