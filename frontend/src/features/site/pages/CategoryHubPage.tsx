import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StateView } from '@/components/ui/StateView'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { HUB_PAGES } from '../config/hub-pages'
import { ALL_SUBGROUPS, useHubSearch } from '../hooks/useHubSearch'
import { resolveHubTools } from '../utils/hub-tools'
import { hubText } from '../utils/hub-text'
import type { HubPageSlug } from '../types/hub-page.types'
import { HubAside } from '../components/HubAside'
import { HubHero } from '../components/HubHero'
import { HubJourney } from '../components/HubJourney'
import { HubToolCard } from '../components/HubToolCard'
import { ToolSearch } from '../components/ToolSearch'

export default function CategoryHubPage({ slug }: { slug: HubPageSlug }) {
  const { t } = useTranslation('site')
  const page = HUB_PAGES[slug]
  const text = hubText(t, slug)
  const catalog = useToolCatalog()
  const hub = useMemo(() => resolveHubTools(page, catalog), [page, catalog])
  const { groupId, keyword, tools, onGroup, onKeyword, reset } = useHubSearch(hub)
  const resultsId = `cn-hub-results-${slug}`
  usePageTitle(text.metaTitle)

  const chips = [{ id: ALL_SUBGROUPS, label: t('filters.all'), count: hub.all.length }, ...hub.groups.map((group) => ({ id: group.id, label: text.subgroups[group.id], count: group.tools.length }))]

  return (
    <div className="cn-site-page cn-hub">
      <HubHero page={page} text={text} />
      <div className="cn-container cn-hub-body">
        <section className="cn-hub-main" aria-label={t('hub.listLabel', { label: text.label.toLowerCase() })}>
          <ToolSearch id={`tim-${slug}`} keyword={keyword} onKeyword={onKeyword} placeholder={text.searchPlaceholder} onSubmit={() => document.getElementById(resultsId)?.focus()} />
          <div className="cn-tool-filters cn-hub-filters" role="group" aria-label={t('hub.subgroupFilter')}>
            {chips.map((chip) => (
              <button key={chip.id} type="button" className={`cn-filter${chip.id === groupId ? ' is-active' : ''}`} aria-pressed={chip.id === groupId} onClick={(event) => { onGroup(chip.id); event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }) }}>
                {chip.label} <span className="cn-filter-count">({chip.count})</span>
              </button>
            ))}
          </div>
          <p id={resultsId} className="cn-results-count" tabIndex={-1} role="status">
            {keyword ? t('results.countFor', { count: tools.length, keyword }) : t('results.count', { count: tools.length })}
          </p>
          {tools.length > 0 ? (
            <ul className="cn-hub-grid">{tools.map((tool) => <li key={tool.id}><HubToolCard tool={tool} /></li>)}</ul>
          ) : (
            <StateView icon="search" title={t('results.empty')} description={t('hub.emptyHint')} actions={<button type="button" className="cn-button" onClick={reset}>{t('hub.showGroup')}</button>} />
          )}
        </section>
        <HubAside items={page.aside} text={text.aside} />
      </div>
      <HubJourney journey={page.journey} text={text.journey} />
    </div>
  )
}
