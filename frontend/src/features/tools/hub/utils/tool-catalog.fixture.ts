import viCatalog from '@/i18n/messages/vi/catalog.json'
import { TOOL_CATALOG } from '../config/tool-catalog'
import { localizeTools, type CatalogMessages } from './tool-text'

/** Vietnamese catalog for tests: search and synonym assertions are written against the Vietnamese copy. */
export const VI_TOOL_CATALOG = localizeTools(TOOL_CATALOG, viCatalog as unknown as CatalogMessages)
