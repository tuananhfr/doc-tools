import { WORKSPACE_TAB_GROUPS, type WorkspaceTabGroup, type WorkspaceTabGroupId } from '../config/workspace-tabs'
import type { ToolDefinition } from '../types/tool.types'
import { toolPath } from './tool-lookup'

export interface WorkspaceTabLink {
  toolId: string
  name: string
  icon: string
  to: string
  current: boolean
}

export interface WorkspaceTabSet {
  groupId: WorkspaceTabGroupId
  tabs: WorkspaceTabLink[]
}

/**
 * Thanh tab của nhóm chứa công cụ đang mở. Công cụ tắt / "Sắp có" bị bỏ (tab của nó sẽ chỉ bật về
 * trang chủ); nhóm còn dưới hai công cụ thì không vẽ thanh — một tab không có gì để chuyển.
 */
export function workspaceTabsFor(toolId: string, catalog: readonly ToolDefinition[], base: string, groups: readonly WorkspaceTabGroup[] = WORKSPACE_TAB_GROUPS): WorkspaceTabSet | null {
  const group = groups.find((item) => item.toolIds.includes(toolId))
  if (!group) return null
  const byId = new Map(catalog.map((tool) => [tool.id, tool]))
  const tabs = group.toolIds.flatMap((id) => {
    const tool = byId.get(id)
    return tool && tool.status === 'ready' ? [{ toolId: id, name: tool.name, icon: tool.icon, to: toolPath(base, tool), current: id === toolId }] : []
  })
  return tabs.length >= 2 ? { groupId: group.id, tabs } : null
}
