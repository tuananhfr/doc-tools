import { useTranslation } from 'react-i18next'
import { TOOL_FILTERS } from '../config/tool-catalog'
import type { ToolFilter } from '../types/tool.types'

interface ToolFiltersProps {
  filter: ToolFilter
  onFilter: (filter: ToolFilter) => void
  compact?: boolean
}

export function ToolFilters({ filter, onFilter, compact = false }: ToolFiltersProps) {
  const { t } = useTranslation('catalog')
  const { t: tc } = useTranslation('common')
  return (
    <div className={`cn-tool-filters${compact ? ' cn-tool-filters--compact' : ''}`} role="group" aria-label={tc('filters.label')}>
      {compact ? <select className="form-select cn-filter-mobile" aria-label={tc('filters.label')} value={filter} onChange={event => onFilter(event.target.value as ToolFilter)}>{TOOL_FILTERS.map(value => <option key={value} value={value}>{t(`groups.${value}`)}</option>)}</select> : null}
      {TOOL_FILTERS.map((value) => <button key={value} type="button" className={`cn-filter${value === filter ? ' is-active' : ''}`} aria-pressed={value === filter} onClick={(event) => { onFilter(value); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }}>{t(`groups.${value}`)}</button>)}
    </div>
  )
}
