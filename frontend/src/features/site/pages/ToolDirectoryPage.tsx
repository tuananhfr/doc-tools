import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { ToolCard } from '@/features/tools/hub/components/ToolCard'
import { useHubPrefs } from '@/features/tools/hub/hooks/useHubPrefs'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { topTools } from '@/features/tools/hub/utils/tool-registry'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { DIRECTORY_GROUP_ICONS, DIRECTORY_GROUPS, directoryGroupTools, type DirectoryGroup } from '../utils/directory-groups'
import { useCatalogSearch } from '../hooks/useCatalogSearch'
import { ToolSearch } from '../components/ToolSearch'
import { RecentTools } from '../components/RecentTools'
import { TrustStrip } from '../components/TrustStrip'
import { FamilyProductLink } from '../components/FamilyProductLink'
import { DirectoryMascot } from '../components/DirectoryMascot'
import { useProductMatches } from '../hooks/useProductMatches'

export default function ToolDirectoryPage() {
  const { t, i18n } = useTranslation('site')
  const { t: studio } = useTranslation('site', { keyPrefix: 'directoryStudio' })
  const { t: tCommunity } = useTranslation('community')
  const { filter, keyword, tools, onFilter, onKeyword, reset, soonCount, showSoon, onShowSoon, catalog } = useCatalogSearch()
  const productMatches = useProductMatches(keyword)
  const { recent } = useHubPrefs()
  const { base } = useToolsBranch()
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState<'recommended' | 'name'>('recommended')
  const [tipOpen, setTipOpen] = useState(true)
  const ResultsHeading = filter === 'all' ? 'h2' : 'h1'
  usePageTitle(t('directory.metaTitle'))

  const groupName = (group: DirectoryGroup) => group === 'all' ? studio('all') : group === 'other' ? studio('other') : t(`hubs.${group}.label`)
  const available = catalog.filter(tool => showSoon || tool.status === 'ready')
  const counts = new Map(DIRECTORY_GROUPS.map(group => [group, directoryGroupTools(available, group).length]))
  const allReady = catalog.filter(tool => tool.status === 'ready').length
  const allSoon = catalog.filter(tool => tool.status === 'soon').length
  const popular = topTools(catalog, 5)
  const ordered = useMemo(() => {
    if (sort === 'name') return [...tools].sort((a, b) => a.name.localeCompare(b.name, i18n.language))
    if (keyword.trim()) return tools
    return [...tools].sort((a, b) => Number(a.status === 'soon') - Number(b.status === 'soon') || (a.priority ?? 999) - (b.priority ?? 999))
  }, [tools, sort, keyword, i18n.language])

  return <div className="cn-site-page cn-directory cn-directory--studio">
    <div className="cn-directory-layout">
      <aside className="cn-directory-navigation" aria-label={t('nav.groups')}>
        <div className="cn-directory-note"><Icon name="heart" /><p>{studio('motto')}</p></div>
        <nav className="cn-directory-groups" aria-label={studio('filterLabel')}>
          {DIRECTORY_GROUPS.map(group => <button key={group} type="button" title={groupName(group)} aria-pressed={filter === group} onClick={() => onFilter(group)}>
            <Icon name={DIRECTORY_GROUP_ICONS[group]} /><span>{groupName(group)}</span><span className="cn-directory-group-count">{counts.get(group)}</span>
          </button>)}
        </nav>
        <section className="cn-directory-suggest"><h2><Icon name="heart-fill" />{studio('suggestTitle')}</h2><p>{studio('suggestHint')}</p><Link to="/de-xuat-tien-ich">{studio('suggestAction')}<Icon name="arrow-right" /></Link></section>
        <div className="cn-directory-nav-footer"><Icon name="house-heart" /><p>{studio('smallThings')}</p></div>
      </aside>

      <div className="cn-directory-center">
        {filter === 'all' ? <section className="cn-directory-welcome" aria-labelledby="cn-directory-title">
          <DirectoryMascot />
          <div className="cn-directory-welcome-content">
            <div className="cn-directory-title-row"><div><h1 id="cn-directory-title">{studio('title')}</h1><p>{studio('lead')}</p></div>
              <div className="cn-directory-summary"><Icon name="bar-chart-line" /><div><strong>{studio('ready', { count: allReady })}</strong>{allSoon ? <span>{studio('soon', { count: allSoon })}</span> : null}</div></div>
            </div>
            <ToolSearch qualityTracking id="tim-cong-cu" keyword={keyword} onKeyword={onKeyword} onSubmit={() => document.getElementById('cn-directory-results')?.focus()} suggestions={catalog} />
            <p className="cn-directory-search-hint"><Icon name="lightbulb" />{studio('searchHint')}</p>
          </div>
        </section> : null}

        <section className="cn-catalog cn-directory-catalog" aria-label={t('directory.catalogLabel')} data-view={view}>
          <div className="cn-directory-toolbar">
            <ResultsHeading id="cn-directory-results" tabIndex={-1} aria-live="polite">{groupName(filter)} <span>({ordered.length})</span></ResultsHeading>
            <div className="cn-directory-display-controls">
              <label>{studio('sort')}<select className="form-select" value={sort} onChange={event => setSort(event.target.value as typeof sort)}><option value="recommended">{studio('recommended')}</option><option value="name">{studio('alphabetical')}</option></select></label>
              <div className="cn-directory-view" role="group" aria-label={studio('viewLabel')}>{(['grid', 'list'] as const).map(value => <button type="button" key={value} aria-label={studio(value)} aria-pressed={view === value} onClick={() => setView(value)}><Icon name={value === 'grid' ? 'grid' : 'list-ul'} /><span>{studio(value)}</span></button>)}</div>
            </div>
          </div>
          <div className="cn-directory-availability">
            {keyword ? <p role="status">{t('results.countFor', { count: ordered.length, keyword })}</p> : null}
            {soonCount ? <label><input type="checkbox" checked={showSoon} onChange={event => onShowSoon(event.target.checked)} />{t('directory.showSoon', { count: soonCount })}</label> : null}
          </div>
          {ordered.length ? <ul className="erp-tools-grid" aria-label={t('directory.title')}>{ordered.map(tool => <li key={tool.id}><ToolCard tool={tool} illustrated /></li>)}</ul>
            : <StateView icon="search" title={t('results.empty')} description={t('results.emptyHint')} actions={<><button type="button" className="cn-button" onClick={reset}>{t('results.showAll')}</button><Link className="cn-button cn-button--ghost" to="/de-xuat-tien-ich">{tCommunity('feedback.searchSuggestion')}</Link></>} />}
          {productMatches.length ? <FamilyProductLink /> : null}
          {filter === 'all' ? <RecentTools recent={recent} /> : null}
        </section>
      </div>

      <aside className="cn-directory-aside" aria-label={studio('asideLabel')}>
        <section className="cn-directory-popular"><h2><Icon name="star-fill" />{studio('popular')}</h2><ol>{popular.map((tool, index) => <li key={tool.id}><Link to={toolPath(base, tool)}><span>{index + 1}</span><strong>{tool.name}</strong><Icon name="chevron-right" /></Link></li>)}</ol></section>
        {tipOpen ? <section className="cn-directory-tip"><h2><Icon name="lightbulb-fill" />{studio('tipTitle')}</h2><button type="button" aria-label={studio('dismissTip')} onClick={() => setTipOpen(false)}><Icon name="x-lg" /></button><p>{studio('tip')}</p></section> : null}
        <div className="cn-directory-cheer"><DirectoryMascot /><p>{studio('cheer')}</p></div>
        <section className="cn-directory-devices" aria-label={studio('devicesLabel')}><div>{[{ icon: 'laptop', label: 'PC / Laptop' }, { icon: 'tablet', label: 'Tablet' }, { icon: 'phone', label: 'Mobile' }, { icon: 'globe', label: 'Web' }].map(item => <span key={item.icon}><Icon name={item.icon} />{item.label}</span>)}</div><p>{studio('devicesHint')}</p></section>
      </aside>
    </div>
    <TrustStrip />
  </div>
}
