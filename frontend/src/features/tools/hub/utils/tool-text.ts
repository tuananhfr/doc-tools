import type { ToolEntry, ToolText } from '../types/tool.types'

/** Shape of the `catalog` namespace that the catalog reads directly (no `t()`: ids are dynamic). */
export interface CatalogMessages {
  pageTitle: string
  tools: Record<string, { name: string; description: string; pageTitle?: string; privacyNote?: string; synonyms?: string }>
}

/** Người dịch được dùng dấu phẩy của ngôn ngữ mình (`,` `，` `、` `،`). */
const SYNONYM_SEPARATOR = /\s*[,，、،]\s*/

/**
 * Gắn chữ của một ngôn ngữ vào danh mục. Công cụ thiếu chữ vẫn hiện bằng `id`
 * thay vì làm sập trang — test `messages` mới là chỗ chặn thiếu bản dịch.
 */
export function localizeTools<T extends ToolEntry>(entries: readonly T[], messages: CatalogMessages): (T & ToolText)[] {
  return entries.map((entry) => {
    const text = messages.tools[entry.id]
    const name = text?.name ?? entry.id
    return {
      ...entry,
      name,
      description: text?.description ?? '',
      pageTitle: text?.pageTitle ?? messages.pageTitle.replace('{{name}}', name),
      privacyNote: text?.privacyNote,
      synonyms: text?.synonyms ? text.synonyms.split(SYNONYM_SEPARATOR).filter(Boolean) : [],
    }
  })
}
