import { useMemo, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { EcosystemSection } from '@/features/site/components/EcosystemSection'
import { RecentTools } from '@/features/site/components/RecentTools'
import { TrustStrip } from '@/features/site/components/TrustStrip'
import { FEATURED_TOOLS, HOME_TITLE } from '@/features/site/config/home-content'
import { ToolCard } from '../components/ToolCard'
import { ToolFilters } from '../components/ToolFilters'
import { ToolsHero } from '../components/ToolsHero'
import { TOOL_CATALOG } from '../config/tool-catalog'
import { useToolsBranch } from '../hooks/tools-branch'
import { useHubPrefs } from '../hooks/useHubPrefs'
import { usePageTitle } from '../hooks/usePageTitle'
import type { ToolFilter } from '../types/tool.types'
import { filterTools, legacyToolPath } from '../utils/tool-lookup'

export default function ToolsHubPage() {
  const [params] = useSearchParams()
  const { base } = useToolsBranch()
  const { recent } = useHubPrefs()
  const [filter, setFilter] = useState<ToolFilter>('all')
  const [keyword, setKeyword] = useState('')
  const browsing = filter === 'all' && keyword.trim() === ''
  const tools = useMemo(() => browsing ? FEATURED_TOOLS : filterTools(TOOL_CATALOG, filter, keyword), [browsing, filter, keyword])
  usePageTitle(HOME_TITLE)
  const legacy = params.get('tool')
  if (legacy !== null) return <Navigate to={legacyToolPath(base, legacy)} replace />

  return (
    <div className="cn-site-page cn-home">
      <ToolsHero keyword={keyword} onKeyword={setKeyword} onSearch={() => document.getElementById('cn-home-tools-title')?.focus()} />
      <section className="cn-container cn-catalog cn-home-catalog" aria-labelledby="cn-home-tools-title">
        <div className="cn-catalog-heading">
          <h2 id="cn-home-tools-title" tabIndex={-1}>Bạn cần làm gì hôm nay?</h2>
          <Link className="cn-catalog-all" to="/cong-cu">Xem tất cả công cụ <Icon name="arrow-right" /></Link>
        </div>
        <ToolFilters filter={filter} onFilter={setFilter} />
        {!browsing ? <p className="cn-results-count" role="status">{tools.length} công cụ{keyword ? ` cho “${keyword}”` : ''}</p> : null}
        {tools.length > 0 ? (
          <ul id="erp-tools-grid" className="erp-tools-grid" aria-label={browsing ? 'Công cụ hay dùng' : 'Công cụ'}>{tools.map((tool) => <li key={tool.id}><ToolCard tool={tool} /></li>)}</ul>
        ) : (
          <StateView icon="search" title="Không tìm thấy công cụ nào" description="Thử từ khoá khác hoặc bỏ bớt bộ lọc." actions={<button type="button" className="cn-button" onClick={() => { setFilter('all'); setKeyword('') }}>Xem tất cả công cụ</button>} />
        )}
        <RecentTools recent={recent} />
      </section>
      <TrustStrip />
      <EcosystemSection />
    </div>
  )
}
