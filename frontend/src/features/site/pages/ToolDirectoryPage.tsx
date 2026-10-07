import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { ToolCard } from '@/features/tools/hub/components/ToolCard'
import { ToolFilters } from '@/features/tools/hub/components/ToolFilters'
import { useHubPrefs } from '@/features/tools/hub/hooks/useHubPrefs'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { READY_TOOL_COUNT } from '../config/home-content'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { ToolSearch } from '../components/ToolSearch'
import { RecentTools } from '../components/RecentTools'
import { TrustStrip } from '../components/TrustStrip'

export default function ToolDirectoryPage() {
  const { t } = useTranslation('site')
  const { filter, keyword, tools, onFilter, onKeyword, reset } = useCatalogSearch()
  const { recent } = useHubPrefs()
  usePageTitle(t('directory.metaTitle'))

  return (
    <div className="cn-site-page cn-directory">
      <section className="cn-directory-intro" aria-labelledby="cn-directory-title">
        <div className="cn-container">
          <Link className="cn-directory-back" to="/"><Icon name="arrow-left" /> Chuyện Nhỏ</Link>
          <h1 id="cn-directory-title">{t('directory.title')}</h1>
          <p>{t('directory.lead', { count: READY_TOOL_COUNT })}</p>
          <ToolSearch id="tim-cong-cu" keyword={keyword} onKeyword={onKeyword} onSubmit={() => document.getElementById('cn-directory-results')?.focus()} />
        </div>
      </section>
      <section className="cn-container cn-catalog cn-directory-catalog" aria-label={t('directory.catalogLabel')}>
        <ToolFilters filter={filter} onFilter={onFilter} />
        <p id="cn-directory-results" className="cn-results-count" tabIndex={-1} role="status">{keyword ? t('results.countFor', { count: tools.length, keyword }) : t('results.count', { count: tools.length })}</p>
        {tools.length > 0 ? (
          <ul className="erp-tools-grid" aria-label={t('directory.title')}>{tools.map((tool) => <li key={tool.id}><ToolCard tool={tool} /></li>)}</ul>
        ) : (
          <StateView icon="search" title={t('results.empty')} description={t('results.emptyHint')} actions={<button type="button" className="cn-button" onClick={reset}>{t('results.showAll')}</button>} />
        )}
        <RecentTools recent={recent} />
      </section>
      <TrustStrip />
    </div>
  )
}
