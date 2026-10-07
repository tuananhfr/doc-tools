import { searchTools } from './tool-search'
import { CATEGORY_TONE, LEGACY_TOOL_QUERY, TOOL_CATALOG } from '../config/tool-catalog'
import type { ToolDefinition, ToolEntry, ToolFilter, ToolTone } from '../types/tool.types'

/** Build a tool URL within its public or ERPCons branch. */
export function toolPath(base: string, tool: Pick<ToolEntry, 'slug'>): string {
  return `${base.replace(/\/+$/, '')}/${tool.slug}`
}

/** Đường dẫn theo `id` — cho công cụ này mở công cụ khác mà không chép slug sang chỗ thứ hai. */
export function toolPathOf(base: string, id: string, catalog: readonly ToolEntry[] = TOOL_CATALOG): string {
  const tool = catalog.find((item) => item.id === id)
  return tool && tool.status === 'ready' ? toolPath(base, tool) : base
}

export function toolTone(tool: Pick<ToolEntry, 'categories'>): ToolTone {
  return CATEGORY_TONE[tool.categories[0]]
}

/** Tên thương hiệu đứng sau tiêu đề ở mọi ngôn ngữ. */
export function toolPageTitle(tool: Pick<ToolDefinition, 'pageTitle'>): string {
  return `${tool.pageTitle} · Chuyện Nhỏ`
}

export function findToolBySlug<T extends ToolEntry>(slug: string, catalog: readonly T[]): T | null {
  return catalog.find((tool) => tool.slug === slug) ?? null
}

export interface ToolRoute<T extends ToolEntry = ToolEntry> {
  /** Công cụ MỞ ĐƯỢC ở đường dẫn này; null = về trang chọn công cụ. */
  tool: Extract<T, { status: 'ready' }> | null
  /** Slug chuẩn khi URL đang mở lệch chuẩn (viết hoa); null = giữ nguyên. */
  redirect: string | null
}

/**
 * Slug lạ và slug của công cụ "Sắp có" đều về trang chọn — không có trang lỗi:
 * link đã chia sẻ mà gõ sai vẫn đưa người ta tới chỗ chọn được công cụ.
 * Truyền danh mục đã gắn ngôn ngữ (`useToolCatalog()`) khi cần hiện tên công cụ.
 */
export function resolveToolRoute<T extends ToolEntry = ToolEntry>(slug: string | undefined, catalog: readonly T[] = TOOL_CATALOG as unknown as readonly T[]): ToolRoute<T> {
  const normalized = slug?.trim().toLowerCase() ?? ''
  const tool = findToolBySlug(normalized, catalog)
  if (!tool || tool.status !== 'ready') return { tool: null, redirect: null }
  return { tool: tool as Extract<T, { status: 'ready' }>, redirect: normalized === slug ? null : tool.slug }
}

/**
 * Điều hướng này có gỡ MÀN đang mở không? Đổi giữa hai slug chung một màn (Xem
 * PDF ↔ Chỉnh sửa PDF) không dựng lại màn nên không tính là rời — tệp còn nguyên.
 */
export function leavesToolScreen(base: string, currentPath: string, nextPath: string, catalog: readonly ToolEntry[] = TOOL_CATALOG): boolean {
  const prefix = `${base.replace(/\/+$/, '')}/`
  const screenAt = (path: string) => (path.startsWith(prefix) ? (resolveToolRoute(path.slice(prefix.length).replace(/\/+$/, ''), catalog).tool?.screen ?? null) : null)
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
export function toolNeedsFullWidth(slug: string | undefined, catalog: readonly ToolEntry[] = TOOL_CATALOG): boolean {
  return resolveToolRoute(slug, catalog).tool?.screen === 'editor'
}

/** Đường dẫn chuẩn của một link `?tool=` cũ; giá trị lạ về trang chọn công cụ. */
export function legacyToolPath(base: string, query: string): string {
  const slug = LEGACY_TOOL_QUERY[query.trim().toLowerCase()]
  return slug ? toolPath(base, { slug }) : base
}

/** Filter the directory or rank usable tools for a search query. */
export function filterTools<T extends ToolDefinition>(catalog: readonly T[], filter: ToolFilter, keyword: string): T[] {
  return searchTools(catalog, keyword, filter)
}
