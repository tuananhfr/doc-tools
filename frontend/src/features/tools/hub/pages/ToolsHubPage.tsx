import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Icon, StateView } from '@/components/ui'
import { appConfig } from '@/config/app.config'
import { useAuthStore } from '@/store/auth.store'
import { HubAside } from '../components/HubAside'
import { ToolCard } from '../components/ToolCard'
import { ToolFilters } from '../components/ToolFilters'
import { ToolsHero } from '../components/ToolsHero'
import { TOOL_CATALOG } from '../config/tool-catalog'
import { useToolsBranch } from '../hooks/tools-branch'
import { useHubPrefs } from '../hooks/useHubPrefs'
import { usePageTitle } from '../hooks/usePageTitle'
import type { ToolFilter } from '../types/tool.types'
import { filterTools, legacyToolPath } from '../utils/tool-lookup'
import { topTools } from '../utils/tool-registry'

const PAGE_TITLE = 'Chuyện Nhỏ — công cụ miễn phí · ERPCons'
const TOP_TOOLS = topTools(TOOL_CATALOG)

/**
 * TRANG CHỌN CÔNG CỤ của "Chuyện Nhỏ" (`/doc-tools` công khai, `/tools` trong app).
 *
 * Không cần phiên; lệnh gọi máy chủ duy nhất là bộ đếm lượt mở (`/tools/visits`,
 * `/tools/stats` — route công khai). Khung quanh nó do NHÁNH ROUTE quyết định
 * (`routes/tools.routes.tsx`), không do phiên: một URL chỉ có một khung.
 */
export default function ToolsHubPage() {
  const [params] = useSearchParams()
  const legacy = params.get('tool')
  const { base } = useToolsBranch()
  const guest = useAuthStore((state) => state.status) === 'unauthenticated'
  const { recent } = useHubPrefs()
  const [filter, setFilter] = useState<ToolFilter>('all')
  const [keyword, setKeyword] = useState('')
  const [showAll, setShowAll] = useState(false)

  // Chưa lọc, chưa tìm: chỉ bày công cụ hay dùng. Chọn nhóm hoặc gõ tìm là xét trên TOÀN BỘ danh mục.
  const browsing = filter === 'all' && keyword.trim() === ''
  const collapsible = browsing && TOP_TOOLS.length > 0 && TOP_TOOLS.length < TOOL_CATALOG.length
  const tools = useMemo(() => (collapsible && !showAll ? TOP_TOOLS : filterTools(TOOL_CATALOG, filter, keyword)), [collapsible, showAll, filter, keyword])

  usePageTitle(PAGE_TITLE)

  // Link `?tool=merge` phát ra trước khi mỗi công cụ có đường dẫn riêng.
  if (legacy !== null) return <Navigate to={legacyToolPath(base, legacy)} replace />

  return (
    <div className="erp-tools">
      <div className="erp-tools__main">
        <ToolsHero />
        <ToolFilters filter={filter} keyword={keyword} onFilter={setFilter} onKeyword={setKeyword} />

        {tools.length > 0 ? (
          <>
            <ul id="erp-tools-grid" className="erp-tools-grid" aria-label={collapsible && !showAll ? 'Công cụ hay dùng' : 'Công cụ'}>
              {tools.map((tool) => (
                <li key={tool.id}>
                  <ToolCard tool={tool} />
                </li>
              ))}
            </ul>
            {collapsible ? (
              <div className="erp-tools-more">
                <button type="button" className="btn btn-outline-secondary" aria-expanded={showAll} aria-controls="erp-tools-grid" onClick={() => setShowAll((value) => !value)}>
                  <Icon name={showAll ? 'chevron-up' : 'grid'} className="me-2" />
                  {showAll ? 'Chỉ hiện công cụ hay dùng' : `Xem tất cả ${TOOL_CATALOG.length} công cụ`}
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <StateView
            icon="search"
            title="Không tìm thấy công cụ nào"
            description="Thử từ khoá khác hoặc bỏ bớt bộ lọc."
            actions={
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => {
                  setFilter('all')
                  setKeyword('')
                }}
              >
                Xem tất cả công cụ
              </button>
            }
          />
        )}
      </div>

      <HubAside recent={recent} guest={guest} />

      <footer className="erp-tools-footer">
        <span>
          <strong>ERPCons</strong> Construction OS · One System – Every Work – Anywhere
        </span>
        <span>Phiên bản {appConfig.version}</span>
        <span className="erp-tools-footer__motto">Chuyện nhỏ – tạo giá trị lớn.</span>
      </footer>
    </div>
  )
}
