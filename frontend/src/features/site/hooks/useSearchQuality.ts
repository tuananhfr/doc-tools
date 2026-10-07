import { useRef } from 'react'
import { recordQualityEvent } from '@/features/tools/hub/services/quality-events'
import { searchTools } from '@/features/tools/hub/utils/tool-search'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'

export function useSearchQuality() {
  const catalog = useToolCatalog()
  const previous = useRef('')
  return (keyword: string) => {
    if (!keyword.trim()) return
    const current = keyword.trim().normalize('NFC').toLocaleLowerCase()
    if (previous.current && previous.current !== current) recordQualityEvent('reformulation')
    previous.current = current
    if (!searchTools(catalog, keyword).length) recordQualityEvent('zero-result')
  }
}
