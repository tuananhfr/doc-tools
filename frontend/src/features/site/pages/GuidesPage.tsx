import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { SitePageHero } from '../components/SitePageHero'
import { GUIDE_GROUPS, GUIDES, type GuideGroupId } from '../config/guides'

type GroupFilter = GuideGroupId | 'all'

const iconOf = (toolId: string) => TOOL_CATALOG.find((tool) => tool.id === toolId)?.icon ?? 'book'

export default function GuidesPage() {
  const { t } = useTranslation('site')
  const { t: tg } = useTranslation('guides')
  usePageTitle(t('pages.huong-dan.title'))
  const [group, setGroup] = useState<GroupFilter>('all')
  const guides = useMemo(() => group === 'all' ? GUIDES : GUIDES.filter((guide) => guide.group === group), [group])
  const chips = [{ id: 'all' as const, label: t('filters.all'), count: GUIDES.length }, ...GUIDE_GROUPS.map((item) => ({ id: item.id, label: tg(`groups.${item.id}`), count: GUIDES.filter((guide) => guide.group === item.id).length }))]

  return (
    <div className="cn-site-page cn-guides">
      <SitePageHero
        id="cn-guides-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('breadcrumb.guides') }]}
        title={<Trans ns="site" i18nKey="guidesPage.title" components={{ accent: <span /> }} />}
        tagline={t('guidesPage.tagline')}
        description={<p>{t('guidesPage.intro')}</p>}
        caption={t('guidesPage.caption')}
        art={<span className="cn-page-hero-icon"><Icon name="book" /></span>}
      />

      <section className="cn-container cn-page-section" aria-labelledby="cn-guides-list">
        <h2 id="cn-guides-list" className="visually-hidden">{t('guidesPage.listTitle')}</h2>
        <div className="cn-tool-filters cn-hub-filters" role="group" aria-label={t('guidesPage.filterLabel')}>
          {chips.map((chip) => (
            <button key={chip.id} type="button" className={`cn-filter${chip.id === group ? ' is-active' : ''}`} aria-pressed={chip.id === group} onClick={() => setGroup(chip.id)}>
              {chip.label} <span className="cn-filter-count">({chip.count})</span>
            </button>
          ))}
        </div>
        <ul className="cn-guide-grid">
          {guides.map((guide) => (
            <li key={guide.slug}>
              <article className="cn-guide-card">
                <span className="cn-guide-card-icon" aria-hidden="true"><Icon name={iconOf(guide.toolIds[0])} /></span>
                <p className="cn-guide-card-group">{tg(`groups.${guide.group}`)}</p>
                <h3><Link to={`/huong-dan/${guide.slug}`}>{tg(`items.${guide.slug}.title`)}</Link></h3>
                <p>{tg(`items.${guide.slug}.summary`)}</p>
                <p className="cn-guide-meta"><Icon name="clock" />{t('guide.minutes', { count: guide.minutes })}<span aria-hidden="true">·</span>{t('guide.steps', { count: guide.steps.length })}</p>
              </article>
            </li>
          ))}
        </ul>
      </section>

      <section className="cn-container cn-page-section">
        <div className="cn-page-callout">
          <Icon name="question-circle" />
          <div>
            <h2>{t('guidesPage.missingTitle')}</h2>
            <p><Trans ns="site" i18nKey="guidesPage.missing" components={{ faq: <Link to="/ho-tro" />, install: <Link to="/cai-dat" />, suggest: <Link to="/de-xuat-tien-ich" /> }} /></p>
          </div>
        </div>
      </section>
    </div>
  )
}
