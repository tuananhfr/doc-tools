import type { ToolDefinition, ToolProcessing } from '../types/tool.types'

/** Số thẻ ở lưới "Hay dùng" của trang chọn công cụ (spec v1.0 §10: Top 12). */
export const TOP_TOOL_COUNT = 12

/**
 * Bỏ công cụ bị tắt bằng cờ khỏi danh mục: không thẻ, không route, slug của nó
 * về trang chọn như slug lạ. Tắt theo `id` chứ không theo slug — hai công cụ
 * chung một màn (Xem PDF ↔ Chỉnh sửa PDF) phải tắt riêng được.
 */
export function enabledTools(catalog: ToolDefinition[], disabledIds: readonly string[]): ToolDefinition[] {
  if (disabledIds.length === 0) return catalog
  const off = new Set(disabledIds)
  return catalog.filter((tool) => !off.has(tool.id))
}

/** Công cụ dùng được có `priority`, nhỏ đứng trước. Công cụ "Sắp có" không chiếm chỗ trong Top. */
export function topTools(catalog: ToolDefinition[], limit = TOP_TOOL_COUNT): ToolDefinition[] {
  return catalog
    .filter((tool) => tool.status === 'ready' && tool.priority !== undefined)
    .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0))
    .slice(0, limit)
}

export function toolProcessing(tool: ToolDefinition): ToolProcessing {
  return tool.processing ?? 'browser'
}
