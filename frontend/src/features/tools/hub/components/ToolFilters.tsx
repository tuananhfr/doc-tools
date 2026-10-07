import { useTranslation } from 'react-i18next'
import { TOOL_FILTERS } from '../config/tool-catalog'
import type { ToolFilter } from '../types/tool.types'

interface ToolFiltersProps {
  filter: ToolFilter
  onFilter: (filter: ToolFilter) => void
}

export function ToolFilters({ filter, onFilter }: ToolFiltersProps) {
  const { t } = useTranslation('catalog')
  const { t: tc } = useTranslation('common')
  return (
    <div className="cn-tool-filters" role="group" aria-label={tc('filters.label')}>
      {TOOL_FILTERS.map((value) => <button key={value} type="button" className={`cn-filter${value === filter ? ' is-active' : ''}`} aria-pressed={value === filter} onClick={(event) => { onFilter(value); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }}>{t(`groups.${value}`)}</button>)}
    </div>
  )
}
