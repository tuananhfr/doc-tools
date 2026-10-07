import { useTranslation } from 'react-i18next'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import type { ReadyTool } from '@/features/tools/hub/types/tool.types'
import { SitePageHero } from '../components/SitePageHero'
import { findGuide, GUIDES } from '../config/guides'
import { guideText } from '../utils/guide'

export default function GuidePage() {
  const { t } = useTranslation('site')
  const { t: tg } = useTranslation('guides')
  const guide = findGuide(useParams().guide)
  const { base } = useToolsBranch()
  const catalog = useToolCatalog()
  const text = guide ? guideText(tg, guide.slug) : null
  usePageTitle(text ? t('guide.metaTitle', { title: text.title }) : t('guide.fallbackTitle'))
  if (!guide || !text) return <Navigate to="/huong-dan" replace />

  // Công cụ bị tắt bằng cờ thì bỏ nút mở, bài vẫn đọc được.
  const tools = guide.toolIds.flatMap((id) => catalog.find((tool): tool is ReadyTool => tool.id === id && tool.status === 'ready') ?? [])
  const primary = tools[0]
  const others = GUIDES.filter((item) => item.slug !== guide.slug && item.group === guide.group).concat(GUIDES.filter((item) => item.group !== guide.group)).slice(0, 3)
  const icon = catalog.find((tool) => tool.id === guide.toolIds[0])?.icon ?? 'book'

  return (
    <div className="cn-site-page cn-guide">
      <SitePageHero
        id="cn-guide-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('breadcrumb.guides'), to: '/huong-dan' }, { label: text.title }]}
        title={text.title}
        description={<p>{text.intro}</p>}
        art={<span className="cn-page-hero-icon"><Icon name={icon} /></span>}
      >
        <p className="cn-guide-meta"><Icon name="clock" />{t('guide.minutes', { count: guide.minutes })}<span aria-hidden="true">·</span>{t('guide.steps', { count: guide.steps.length })}</p>
        {primary ? <div className="cn-page-actions"><Link className="cn-button" to={toolPath(base, primary)}>{t('guide.open', { name: primary.name })} <Icon name="arrow-right" /></Link></div> : null}
      </SitePageHero>

      <div className="cn-container cn-guide-body">
        <article className="cn-guide-main">
          <section aria-labelledby="cn-guide-steps">
            <h2 id="cn-guide-steps">{t('guide.stepsTitle')}</h2>
            <ol className="cn-steps cn-guide-steps">
              {guide.steps.map((step, index) => (
                <li key={step}>
                  <span className="cn-step-number" aria-hidden="true">{index + 1}</span>
                  <span><strong>{text.steps[step].title}</strong><small>{text.steps[step].detail}</small></span>
                </li>
              ))}
            </ol>
          </section>
          <section className="cn-guide-tips" aria-labelledby="cn-guide-tips">
            <h2 id="cn-guide-tips"><Icon name="lightbulb" />{t('guide.tipsTitle')}</h2>
            <ul className="cn-hub-checks">{guide.tips.map((tip) => <li key={tip}><Icon name="check-circle-fill" />{text.tips[tip]}</li>)}</ul>
          </section>
          <section className="cn-page-callout cn-guide-notes" aria-labelledby="cn-guide-notes">
            <Icon name="info-circle" />
            <div>
              <h2 id="cn-guide-notes">{t('guide.notesTitle')}</h2>
              <ul>{guide.notes.map((note) => <li key={note}>{text.notes[note]}</li>)}</ul>
            </div>
          </section>
        </article>

        <aside className="cn-guide-aside" aria-label={t('guide.asideLabel')}>
          {tools.length > 0 ? (
            <section className="cn-hub-aside-card">
              <h2>{t('guide.toolsTitle')}</h2>
              <ul className="cn-guide-links">
                {tools.map((tool) => <li key={tool.id}><Link to={toolPath(base, tool)}><Icon name={tool.icon} /><span>{tool.name}</span><Icon name="arrow-right" /></Link></li>)}
              </ul>
            </section>
          ) : null}
          <section className="cn-hub-aside-card">
            <h2>{t('guide.othersTitle')}</h2>
            <ul className="cn-guide-links">
              {others.map((item) => <li key={item.slug}><Link to={`/huong-dan/${item.slug}`}><Icon name="book" /><span>{tg(`items.${item.slug}.title`)}</span><Icon name="arrow-right" /></Link></li>)}
            </ul>
            <Link className="cn-guide-all" to="/huong-dan">{t('guide.all')} <Icon name="arrow-right" /></Link>
          </section>
        </aside>
      </div>
    </div>
  )
}
