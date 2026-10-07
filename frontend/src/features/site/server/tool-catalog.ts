import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { localizeTools, type CatalogMessages } from '@/features/tools/hub/utils/tool-text'
import type { Locale } from '@/i18n/locales'
import { loadNamespace } from '@/i18n/resources'

/** Server counterpart of `useToolCatalog()` for metadata and share images. */
export async function loadToolCatalog(locale: Locale): Promise<ToolDefinition[]> {
  return localizeTools(TOOL_CATALOG, await loadNamespace(locale, 'catalog') as unknown as CatalogMessages)
}
