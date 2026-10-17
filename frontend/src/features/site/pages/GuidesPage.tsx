import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { normalizeTextSearch } from '@/utils/text-search'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { ToolArtwork } from '@/features/tools/hub/components/ToolArtwork'
import { ReferencePage } from '../components/ReferencePage'
import { ToolSearch } from '../components/ToolSearch'
import { GUIDE_GROUPS, GUIDES, type GuideGroupId } from '../config/guides'

type GroupFilter = GuideGroupId | 'all'
const TOPICS = [
  { id: 'quick', icon: 'rocket-takeoff', to: '#cn-guide-results' },
  { id: 'tools', icon: 'tools', to: '#cn-guide-results' },
  { id: 'faq', icon: 'question-circle', to: '/ho-tro' },
  { id: 'data', icon: 'shield-check', to: '/xu-ly-du-lieu' },
  { id: 'terms', icon: 'file-earmark-text', to: '/dieu-khoan' },
  { id: 'devices', icon: 'phone', to: '/cai-dat' },
] as const

export default function GuidesPage() {
  const { t } = useTranslation('site')
  const { t: tg } = useTranslation('guides')
  const catalog = useToolCatalog()
  usePageTitle(t('pages.huong-dan.title'))
  const [group, setGroup] = useState<GroupFilter>('all')
  const [keyword, setKeyword] = useState('')
  const guides = useMemo(() => {
    const tokens = normalizeTextSearch(keyword).split(' ').filter(Boolean)
    return GUIDES.filter(guide => {
      if (group !== 'all' && guide.group !== group) return false
      const haystack = normalizeTextSearch(`${tg(`items.${guide.slug}.title`)} ${tg(`items.${guide.slug}.summary`)}`)
      return tokens.every(token => haystack.includes(token))
    })
  }, [group, keyword, tg])
  const showAll = () => { setGroup('all'); setKeyword('') }
  const focusGuides = () => { showAll(); document.getElementById('cn-guide-results')?.scrollIntoView({ block: 'start', behavior: 'smooth' }) }
  const sidebar = <nav className="cn-reference-nav" aria-label={t('guidesPage.filterLabel')}>
    <button type="button" aria-pressed={group === 'all'} onClick={showAll}><Icon name="house" />{t('pageStudio.overview')}</button>
    {GUIDE_GROUPS.map(item => <button key={item.id} type="button" aria-pressed={group === item.id} onClick={() => setGroup(item.id)}><Icon name={item.icon} />{tg(`groups.${item.id}`)}</button>)}
    <Link to="/ho-tro"><Icon name="question-circle" />{t('pageStudio.faq')}</Link><Link to="/xu-ly-du-lieu"><Icon name="shield-lock" />{t('pageStudio.topics.data.title')}</Link><Link to="/dieu-khoan"><Icon name="file-earmark-text" />{t('pageStudio.topics.terms.title')}</Link><Link to="/quyen-rieng-tu"><Icon name="shield-check" />{t('pageStudio.privacy')}</Link><Link to="/ho-tro"><Icon name="headset" />{t('pageStudio.support')}</Link>
  </nav>
  return <ReferencePage title={t('pageStudio.guideTitle')} subtitle={t('pageStudio.guideSubtitle')} lead={t('guidesPage.intro')} icon="book" note={t('pageStudio.guideNote')} sidebar={sidebar}
    search={<ToolSearch id="tim-huong-dan" keyword={keyword} onKeyword={setKeyword} placeholder={t('pageStudio.guideSearch')} onSubmit={() => document.getElementById('cn-guide-results')?.focus()} />}>
    <section className="cn-reference-topics"><h2>{t('pageStudio.chooseTopic')}</h2><div>{TOPICS.map(item => {
      const body = <><span className={`cn-reference-topic-icon cn-reference-topic-icon--${item.id}`}><Icon name={item.icon} /></span><span><strong>{t(`pageStudio.topics.${item.id}.title`)}</strong><small>{t(`pageStudio.topics.${item.id}.hint`)}</small></span><Icon name="chevron-right" /></>
      return item.to.startsWith('#') ? <button type="button" key={item.id} onClick={focusGuides}>{body}</button> : <Link key={item.id} to={item.to}>{body}</Link>
    })}</div></section>
    <section className="cn-reference-guides" aria-labelledby="cn-guide-results"><h2 id="cn-guide-results" tabIndex={-1}>{t('pageStudio.toolGuides')} <span>({guides.length})</span></h2>
      {guides.length ? <ul className="cn-reference-guide-grid">{guides.map(guide => { const tool = catalog.find(tool => tool.id === guide.toolIds[0]); return <li key={guide.slug}><Link to={`/huong-dan/${guide.slug}`} className="cn-reference-guide-card"><span className="cn-reference-guide-art">{tool ? <ToolArtwork tool={tool} /> : <Icon name="book" />}</span><span className="cn-guide-card-group">{tg(`groups.${guide.group}`)}</span><h3>{tg(`items.${guide.slug}.title`)}</h3><p>{tg(`items.${guide.slug}.summary`)}</p><span className="cn-guide-meta"><Icon name="clock" />{t('guide.minutes', { count: guide.minutes })}<Icon name="arrow-right" /></span></Link></li> })}</ul> : <div className="cn-reference-empty" role="status"><Icon name="search" /><p>{t('results.empty')}</p><button type="button" className="cn-button" onClick={showAll}>{t('results.showAll')}</button></div>}
    </section>
  </ReferencePage>
}
