import { TOOL_FILTERS } from '../config/tool-catalog'
import type { ToolFilter } from '../types/tool.types'

interface ToolFiltersProps {
  filter: ToolFilter
  onFilter: (filter: ToolFilter) => void
}

export function ToolFilters({ filter, onFilter }: ToolFiltersProps) {
  return (
    <div className="cn-tool-filters" role="group" aria-label="Lọc theo nhóm công cụ">
      {TOOL_FILTERS.map((item) => <button key={item.value} type="button" className={`cn-filter${item.value === filter ? ' is-active' : ''}`} aria-pressed={item.value === filter} onClick={(event) => { onFilter(item.value); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }}>{item.label}</button>)}
    </div>
  )
}
