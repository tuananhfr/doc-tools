import { useEffect, useMemo, useState } from 'react'
import type { ReadyTool } from '@/features/tools/hub/types/tool.types'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { readRecentTools } from '@/features/tools/hub/utils/hub-prefs'
import { findToolBySlug } from '@/features/tools/hub/utils/tool-lookup'

export function useHubPrefs() {
  // Browser storage is unavailable to SSR; restore it after the first matching render.
  const [recentSlugs, setRecentSlugs] = useState<string[]>([])
  useEffect(() => { setRecentSlugs(readRecentTools()) }, [])
  const catalog = useToolCatalog()
  const recent = useMemo(() => recentSlugs.map(slug => findToolBySlug(slug, catalog)).filter((tool): tool is ReadyTool => tool?.status === 'ready'), [recentSlugs, catalog])
  return { recent }
}
