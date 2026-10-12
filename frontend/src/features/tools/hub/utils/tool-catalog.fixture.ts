import viCatalog from '@/i18n/messages/vi/catalog.json'
import { ALL_TOOLS } from '../config/tool-list'
import { isProductEntry } from '@/features/site/config/product-registry'
import { TOOL_CATALOG } from '../config/tool-catalog'
import { localizeTools, type CatalogMessages } from './tool-text'

/** Vietnamese catalog for tests: search and synonym assertions are written against the Vietnamese copy. */
export const VI_TOOL_CATALOG = localizeTools(TOOL_CATALOG, viCatalog as unknown as CatalogMessages)

export const VI_PRODUCT_CATALOG = localizeTools(ALL_TOOLS.filter(isProductEntry), viCatalog as unknown as CatalogMessages)
