import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { filterTools } from '@/features/tools/hub/utils/tool-lookup'
import type { HubPage } from '../types/hub-page.types'

export interface HubToolGroup {
  id: string
  tools: ToolDefinition[]
}

export interface HubTools {
  all: ToolDefinition[]
  groups: HubToolGroup[]
}

/** Công cụ dùng được đứng trước thẻ "Sắp có"; trong mỗi nhóm giữ thứ tự khai báo. */
export function readyFirst(tools: ToolDefinition[]): ToolDefinition[] {
  return [...tools.filter((tool) => tool.status === 'ready'), ...tools.filter((tool) => tool.status !== 'ready')]
}

/**
 * Nối id trong config với danh mục đang chạy. Id bị tắt bằng `VITE_TOOLS_OFF`
 * biến mất êm, và nhóm con rỗng thì không có chip: chip dẫn tới lưới trống trông như lỗi.
 */
export function resolveHubTools(page: HubPage, catalog: readonly ToolDefinition[]): HubTools {
  const byId = new Map(catalog.map((tool) => [tool.id, tool]))
  const groups = page.subgroups
    .map((group) => ({
      id: group.id,
      tools: readyFirst(group.toolIds.flatMap((id) => byId.get(id) ?? [])),
    }))
    .filter((group) => group.tools.length > 0)
  const all = readyFirst([...new Map(groups.flatMap((group) => group.tools).map((tool) => [tool.id, tool])).values()])
  return { all, groups }
}

export function searchHubTools(hub: HubTools, groupId: string, keyword: string): ToolDefinition[] {
  const pool = hub.groups.find((group) => group.id === groupId)?.tools ?? hub.all
  return filterTools(pool, 'all', keyword)
}
