import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'

/** Giữ thứ tự khai báo; bỏ công cụ đã tắt / "Sắp có" để không có chip nào chỉ dẫn ngược về trang chủ. */
export function pickCommonTasks<T extends Pick<ToolDefinition, 'id' | 'status'>>(ids: readonly string[], catalog: readonly T[]): T[] {
  const byId = new Map(catalog.map((tool) => [tool.id, tool]))
  return ids.flatMap((id) => {
    const tool = byId.get(id)
    return tool && tool.status === 'ready' ? [tool] : []
  })
}
