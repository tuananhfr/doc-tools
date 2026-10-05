import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { ToolCard } from '@/features/tools/hub/components/ToolCard'
import { ToolFilters } from '@/features/tools/hub/components/ToolFilters'
import { useHubPrefs } from '@/features/tools/hub/hooks/useHubPrefs'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { DIRECTORY_TITLE, READY_TOOL_COUNT } from '../config/home-content'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { ToolSearch } from '../components/ToolSearch'
import { RecentTools } from '../components/RecentTools'
import { TrustStrip } from '../components/TrustStrip'

export default function ToolDirectoryPage() {
  const { filter, keyword, tools, onFilter, onKeyword, reset } = useCatalogSearch()
  const { recent } = useHubPrefs()
  usePageTitle(DIRECTORY_TITLE)

  return (
    <div className="cn-site-page cn-directory">
      <section className="cn-directory-intro" aria-labelledby="cn-directory-title">
        <div className="cn-container">
          <Link className="cn-directory-back" to="/"><Icon name="arrow-left" /> Chuyện Nhỏ</Link>
          <h1 id="cn-directory-title">Tất cả công cụ</h1>
          <p>{READY_TOOL_COUNT} công cụ miễn phí. Chọn việc bạn cần, dùng ngay trong trình duyệt.</p>
          <ToolSearch id="tim-cong-cu" keyword={keyword} onKeyword={onKeyword} onSubmit={() => document.getElementById('cn-directory-results')?.focus()} />
        </div>
      </section>
      <section className="cn-container cn-catalog cn-directory-catalog" aria-label="Danh mục công cụ">
        <ToolFilters filter={filter} onFilter={onFilter} />
        <p id="cn-directory-results" className="cn-results-count" tabIndex={-1} role="status">{tools.length} công cụ{keyword ? ` cho “${keyword}”` : ''}</p>
        {tools.length > 0 ? (
          <ul className="erp-tools-grid" aria-label="Tất cả công cụ">{tools.map((tool) => <li key={tool.id}><ToolCard tool={tool} /></li>)}</ul>
        ) : (
          <StateView icon="search" title="Không tìm thấy công cụ nào" description="Thử từ khoá khác hoặc bỏ bớt bộ lọc." actions={<button type="button" className="cn-button" onClick={reset}>Xem tất cả công cụ</button>} />
        )}
        <RecentTools recent={recent} />
      </section>
      <TrustStrip />
    </div>
  )
}
