import { useMemo, useState } from 'react'
import { TOOL_CATALOG } from '../config/tool-catalog'
import type { ToolDefinition } from '../types/tool.types'
import { readRecentTools } from '../utils/hub-prefs'
import { findToolBySlug } from '../utils/tool-lookup'

/** Danh sách "dùng gần đây" của trang chọn công cụ — đọc một lần lúc mở trang. */
export function useHubPrefs() {
  const [recentSlugs] = useState<string[]>(readRecentTools)

  // Slug đã lưu có thể thuộc công cụ đã gỡ khỏi danh mục — bỏ qua thay vì vẽ dòng chết.
  const recent = useMemo(
    () => recentSlugs.map((slug) => findToolBySlug(slug, TOOL_CATALOG)).filter((tool): tool is ToolDefinition => tool?.status === 'ready'),
    [recentSlugs],
  )

  return { recent }
}
