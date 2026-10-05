import { Icon } from '@/components/ui'
import { TOOL_FILTERS } from '../config/tool-catalog'
import type { ToolFilter } from '../types/tool.types'

interface ToolFiltersProps {
  filter: ToolFilter
  keyword: string
  onFilter: (filter: ToolFilter) => void
  onKeyword: (keyword: string) => void
}

/**
 * Hàng lọc của trang chọn công cụ, MỘT dòng: ô tìm · nhóm (trượt ngang).
 * Thứ tự trong DOM theo đúng thứ tự nhìn thấy để Tab đi từ trái sang phải.
 */
export function ToolFilters({ filter, keyword, onFilter, onKeyword }: ToolFiltersProps) {
  return (
    <div className="erp-tools-filters">
      <label className="erp-tools-search">
        <Icon name="search" />
        <span className="visually-hidden">Tìm công cụ</span>
        <input
          type="search"
          className="form-control"
          placeholder="Tìm công cụ…"
          value={keyword}
          onChange={(event) => onKeyword(event.target.value)}
        />
      </label>

      <div className="erp-tools-filters__chips" role="group" aria-label="Lọc theo nhóm công cụ">
        {TOOL_FILTERS.map((item) => {
          const active = item.value === filter
          return (
            <button
              key={item.value}
              type="button"
              className={`erp-chip erp-tools-chip${active ? ' erp-chip--active' : ''}`}
              aria-pressed={active}
              onClick={(event) => {
                onFilter(item.value)
                // Nhóm vừa chọn có thể đang khuất nửa chừng ở mép dãy trượt.
                event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'center' })
              }}
            >
              {item.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
