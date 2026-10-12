import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ALL_TOOLS } from '@/features/tools/hub/config/tool-list'
import { localizeTools, type CatalogMessages } from '@/features/tools/hub/utils/tool-text'
import { searchTools } from '@/features/tools/hub/utils/tool-search'
import { isProductEntry } from '../config/product-registry'

export function useProductMatches(keyword: string) {
  const { i18n } = useTranslation('catalog')
  const messages = i18n.getResourceBundle(i18n.language, 'catalog') as CatalogMessages
  return useMemo(() => keyword.trim() ? searchTools(localizeTools(ALL_TOOLS.filter(isProductEntry), messages), keyword) : [], [keyword, messages])
}
