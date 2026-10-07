import { useMemo, useState } from 'react'
import type { ReadyTool } from '../types/tool.types'
import { readRecentTools } from '../utils/hub-prefs'
import { findToolBySlug } from '../utils/tool-lookup'
import { useToolCatalog } from './useToolCatalog'

/** Danh sách "dùng gần đây" của trang chọn công cụ — đọc một lần lúc mở trang. */
export function useHubPrefs() {
  const [recentSlugs] = useState<string[]>(readRecentTools)
  const catalog = useToolCatalog()

  // Slug đã lưu có thể thuộc công cụ đã gỡ khỏi danh mục — bỏ qua thay vì vẽ dòng chết.
  const recent = useMemo(
    () => recentSlugs.map((slug) => findToolBySlug(slug, catalog)).filter((tool): tool is ReadyTool => tool?.status === 'ready'),
    [recentSlugs, catalog],
  )

  return { recent }
}
