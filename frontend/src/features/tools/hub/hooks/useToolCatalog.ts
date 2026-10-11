import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { TOOL_CATALOG } from '../config/tool-catalog'
import type { ToolDefinition } from '../types/tool.types'
import { localizeTools, type CatalogMessages } from '../utils/tool-text'

/** Danh mục đã gắn chữ của ngôn ngữ đang xem. `catalog` là namespace khởi động nên có sẵn từ lần vẽ đầu. */
export function useToolCatalog(): ToolDefinition[] {
  const { i18n } = useTranslation('catalog')
  const messages = i18n.getResourceBundle(i18n.language, 'catalog') as CatalogMessages
  return useMemo(() => localizeTools(TOOL_CATALOG, messages), [messages])
}
