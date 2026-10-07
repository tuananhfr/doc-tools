import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { EcosystemSection } from '@/features/site/components/EcosystemSection'
import { RecentTools } from '@/features/site/components/RecentTools'
import { TrustStrip } from '@/features/site/components/TrustStrip'
import { FEATURED_TOOL_COUNT } from '@/features/site/config/home-content'
import { ToolCard } from '../components/ToolCard'
import { ToolFilters } from '../components/ToolFilters'
import { ToolsHero } from '../components/ToolsHero'
import { useToolsBranch } from '../hooks/tools-branch'
import { useHubPrefs } from '../hooks/useHubPrefs'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToolCatalog } from '../hooks/useToolCatalog'
import type { ToolFilter } from '../types/tool.types'
import { filterTools, legacyToolPath } from '../utils/tool-lookup'
import { topTools } from '../utils/tool-registry'

export default function ToolsHubPage() {
  const { t } = useTranslation('site')
  const [params] = useSearchParams()
  const { base } = useToolsBranch()
  const { recent } = useHubPrefs()
  const catalog = useToolCatalog()
  const [filter, setFilter] = useState<ToolFilter>('all')
  const [keyword, setKeyword] = useState('')
  const browsing = filter === 'all' && keyword.trim() === ''
  const tools = useMemo(() => browsing ? topTools(catalog, FEATURED_TOOL_COUNT) : filterTools(catalog, filter, keyword), [browsing, catalog, filter, keyword])
  usePageTitle(t('home.metaTitle'))
  const legacy = params.get('tool')
  if (legacy !== null) return <Navigate to={legacyToolPath(base, legacy)} replace />

  return (
    <div className="cn-site-page cn-home">
      <ToolsHero keyword={keyword} onKeyword={setKeyword} onSearch={() => document.getElementById('cn-home-tools-title')?.focus()} />
      <section className="cn-container cn-catalog cn-home-catalog" aria-labelledby="cn-home-tools-title">
        <div className="cn-catalog-heading">
          <h2 id="cn-home-tools-title" tabIndex={-1}>{t('home.catalogTitle')}</h2>
          <Link className="cn-catalog-all" to="/cong-cu">{t('results.showAll')} <Icon name="arrow-right" /></Link>
        </div>
        <ToolFilters filter={filter} onFilter={setFilter} />
        {!browsing ? <p className="cn-results-count" role="status">{keyword ? t('results.countFor', { count: tools.length, keyword }) : t('results.count', { count: tools.length })}</p> : null}
        {tools.length > 0 ? (
          <ul id="erp-tools-grid" className="erp-tools-grid" aria-label={browsing ? t('home.featuredLabel') : t('home.resultsLabel')}>{tools.map((tool) => <li key={tool.id}><ToolCard tool={tool} /></li>)}</ul>
        ) : (
          <StateView icon="search" title={t('results.empty')} description={t('results.emptyHint')} actions={<button type="button" className="cn-button" onClick={() => { setFilter('all'); setKeyword('') }}>{t('results.showAll')}</button>} />
        )}
        <RecentTools recent={recent} />
      </section>
      <TrustStrip />
      <EcosystemSection />
    </div>
  )
}
