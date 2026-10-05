import { normalizeTextSearch } from '@/utils/text-search'
import { CATEGORY_TONE, LEGACY_TOOL_QUERY, TOOL_CATALOG } from '../config/tool-catalog'
import type { ReadyTool, ToolDefinition, ToolFilter, ToolTone } from '../types/tool.types'

/** `base` = gốc của nhánh đang đứng (`useToolsBranch().base`): `/doc-tools` hoặc `/tools`. */
export function toolPath(base: string, tool: Pick<ToolDefinition, 'slug'>): string {
  return `${base}/${tool.slug}`
}

/** Đường dẫn theo `id` — cho công cụ này mở công cụ khác mà không chép slug sang chỗ thứ hai. */
export function toolPathOf(base: string, id: string, catalog: ToolDefinition[] = TOOL_CATALOG): string {
  const tool = catalog.find((item) => item.id === id)
  return tool && tool.status === 'ready' ? toolPath(base, tool) : base
}

export function toolTone(tool: ToolDefinition): ToolTone {
  return CATEGORY_TONE[tool.categories[0]]
}

export function toolPageTitle(tool: ToolDefinition): string {
  return `${tool.pageTitle ?? `${tool.name} miễn phí`} · ERPCons`
}

export function findToolBySlug(slug: string, catalog: ToolDefinition[] = TOOL_CATALOG): ToolDefinition | null {
  return catalog.find((tool) => tool.slug === slug) ?? null
}

export interface ToolRoute {
  /** Công cụ MỞ ĐƯỢC ở đường dẫn này; null = về trang chọn công cụ. */
  tool: ReadyTool | null
  /** Slug chuẩn khi URL đang mở lệch chuẩn (viết hoa); null = giữ nguyên. */
  redirect: string | null
}

/**
 * Slug lạ và slug của công cụ "Sắp có" đều về trang chọn — không có trang lỗi:
 * link đã chia sẻ mà gõ sai vẫn đưa người ta tới chỗ chọn được công cụ.
 */
export function resolveToolRoute(slug: string | undefined, catalog: ToolDefinition[] = TOOL_CATALOG): ToolRoute {
  const normalized = slug?.trim().toLowerCase() ?? ''
  const tool = findToolBySlug(normalized, catalog)
  if (!tool || tool.status !== 'ready') return { tool: null, redirect: null }
  return { tool, redirect: normalized === slug ? null : tool.slug }
}

/**
 * Điều hướng này có gỡ MÀN đang mở không? Đổi giữa hai slug chung một màn (Xem
 * PDF ↔ Chỉnh sửa PDF) không dựng lại màn nên không tính là rời — tệp còn nguyên.
 */
export function leavesToolScreen(base: string, currentPath: string, nextPath: string, catalog: ToolDefinition[] = TOOL_CATALOG): boolean {
  const screenAt = (path: string) => (path.startsWith(`${base}/`) ? (resolveToolRoute(path.slice(base.length + 1).replace(/\/+$/, ''), catalog).tool?.screen ?? null) : null)
  const current = screenAt(currentPath)
  return current === null || screenAt(nextPath) !== current
}

/**
 * Công cụ này có cần TRỌN bề ngang màn hình không?
 *
 * Trình chỉnh sửa PDF là bàn làm việc (lưới trang + cột xuất tệp): khung khách
 * bỏ cột ảnh bìa cho nó. Các công cụ còn lại là một thẻ chọn tệp / một bảng nhập
 * liệu, vừa trong cột phải.
 */
export function toolNeedsFullWidth(slug: string | undefined, catalog: ToolDefinition[] = TOOL_CATALOG): boolean {
  return resolveToolRoute(slug, catalog).tool?.screen === 'editor'
}

/** Đường dẫn chuẩn của một link `?tool=` cũ; giá trị lạ về trang chọn công cụ. */
export function legacyToolPath(base: string, query: string): string {
  const slug = LEGACY_TOOL_QUERY[query.trim().toLowerCase()]
  return slug ? toolPath(base, { slug }) : base
}

/** Lọc theo nhóm rồi theo từ khoá (bỏ dấu, mỗi từ chỉ cần có trong tên, mô tả hoặc từ đồng nghĩa). */
export function filterTools(catalog: ToolDefinition[], filter: ToolFilter, keyword: string): ToolDefinition[] {
  const tokens = normalizeTextSearch(keyword).split(' ').filter(Boolean)
  return catalog.filter((tool) => {
    if (filter !== 'all' && !tool.categories.includes(filter)) return false
    if (tokens.length === 0) return true
    const haystack = normalizeTextSearch(`${tool.name} ${tool.description} ${tool.synonyms?.join(' ') ?? ''}`)
    return tokens.every((token) => haystack.includes(token))
  })
}
