import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import type { HubPage, HubPageText } from '../types/hub-page.types'
import type { HubTools } from '../utils/hub-tools'
import type { useHubSearch } from '../hooks/useHubSearch'
import { ReferencePage, CategoryNavigation } from './ReferencePage'
import { ToolSearch } from './ToolSearch'
import { HubToolCard } from './HubToolCard'
import { FamilyProductLink } from './FamilyProductLink'

export function CategoryStudio({ page, text, hub, search }: { page: HubPage; text: HubPageText; hub: HubTools; search: ReturnType<typeof useHubSearch> }) {
  const { t } = useTranslation('site')
  const [showSoon, setShowSoon] = useState(false)
  const { groupId, keyword, onGroup, onKeyword, reset } = search
  const visible = (tool: HubTools['all'][number]) => showSoon || tool.status === 'ready'
  const tools = search.tools.filter(visible)
  const chips = [{ id: 'all', label: t('filters.all'), count: hub.all.filter(visible).length }, ...hub.groups.map(group => ({ id: group.id, label: text.subgroups[group.id], count: group.tools.filter(visible).length })).filter(group => group.count > 0)]
  const family = page.slug === 'gia-dinh'
  const resultId = `cn-category-results-${page.slug}`
  const toggleSoon = (value: boolean) => {
    setShowSoon(value)
    if (!value && groupId !== 'all' && !hub.groups.find(group => group.id === groupId)?.tools.some(tool => tool.status === 'ready')) onGroup('all')
  }
  return <ReferencePage title={text.label} subtitle={text.tagline} lead={text.description} icon={family ? 'house-heart' : 'controller'} note={t(family ? 'pageStudio.familyNote' : 'pageStudio.exploreNote')}
    reference={!family} sidebar={<CategoryNavigation current={page.slug} />}
    search={<ToolSearch qualityTracking id={`tim-${page.slug}`} keyword={keyword} onKeyword={onKeyword} placeholder={text.searchPlaceholder} onSubmit={() => document.getElementById(resultId)?.focus()} />}>
    {family ? <FamilyProductLink /> : null}
    <section className="cn-reference-catalog" aria-labelledby={resultId}>
      <div className="cn-reference-filters" role="group" aria-label={t('hub.subgroupFilter')}>{chips.map(chip => <button key={chip.id} type="button" aria-pressed={groupId === chip.id} onClick={() => onGroup(chip.id)}>{chip.label}<span>{chip.count}</span></button>)}</div>
      <div className="cn-reference-results"><h2 id={resultId} tabIndex={-1} aria-live="polite">{t('hub.listLabel', { label: text.label.toLowerCase() })}<span>({tools.length})</span></h2>{hub.all.some(tool => tool.status === 'soon') ? <label><input type="checkbox" checked={showSoon} onChange={event => toggleSoon(event.target.checked)} />{t('directory.showSoon', { count: hub.all.filter(tool => tool.status === 'soon').length })}</label> : null}</div>
      {tools.length ? <ul className="cn-hub-grid cn-reference-tool-grid">{tools.map(tool => <li key={tool.id}><HubToolCard tool={tool} /></li>)}</ul> : <StateView icon="search" title={t('results.empty')} description={t('hub.emptyHint')} actions={<button type="button" className="cn-button" onClick={reset}>{t('hub.showGroup')}</button>} />}
    </section><section className="cn-reference-callout"><Icon name={family ? 'people' : 'stars'} /><div><h2>{text.journey.title}</h2><p>{text.journey.motto}</p></div><Link to="/de-xuat-tien-ich">{t('directoryStudio.suggestAction')}<Icon name="arrow-right" /></Link></section>
  </ReferencePage>
}
