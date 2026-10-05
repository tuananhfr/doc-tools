import { useEffect, useMemo, useState } from 'react'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { readRecentTools } from '@/features/tools/hub/utils/hub-prefs'
import { findToolBySlug } from '@/features/tools/hub/utils/tool-lookup'

export function useHubPrefs() {
  // Browser storage is unavailable to SSR; restore it after the first matching render.
  const [recentSlugs, setRecentSlugs] = useState<string[]>([])
  useEffect(() => { setRecentSlugs(readRecentTools()) }, [])
  const recent = useMemo(() => recentSlugs.map(slug => findToolBySlug(slug, TOOL_CATALOG)).filter((tool): tool is ToolDefinition => tool?.status === 'ready'), [recentSlugs])
  return { recent }
}
