import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { SitePageHero } from '../components/SitePageHero'
import { useLocale } from '@/i18n/I18nProvider'
import { DEFAULT_LOCALE } from '@/i18n/locales'
import { LEGAL_DOCUMENTS, LEGAL_DRAFT, LEGAL_UPDATED, type LegalSlug, type LegalText } from '../config/legal'
import { SUPPORT_EMAIL } from '../config/site-navigation'
import { QualityConsent } from '../components/QualityConsent'

export default function LegalPage({ slug }: { slug: LegalSlug }) {
  const { t } = useTranslation('site')
  const { t: tl } = useTranslation('legal')
  const locale = useLocale()
  const doc = LEGAL_DOCUMENTS[slug]
  const text: LegalText = tl(slug, { returnObjects: true, email: SUPPORT_EMAIL })
  usePageTitle(t(`pages.${slug}.title`))

  return (
    <div className="cn-site-page cn-legal">
      <SitePageHero
        id="cn-legal-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: text.breadcrumb }]}
        title={<Trans ns="legal" i18nKey={`${slug}.title`} components={{ accent: <span /> }} />}
        description={(
          <>
            <p>{text.intro}</p>
            <p className="cn-legal-updated"><Icon name="calendar3" />{t('legalPage.updated', { date: LEGAL_UPDATED })}</p>
            {LEGAL_DRAFT ? <p className="cn-legal-draft"><Icon name="hourglass-split" />{tl('draftNotice')}</p> : null}
            {locale !== DEFAULT_LOCALE ? <p>{tl('bindingNotice')}</p> : null}
          </>
        )}
      />

      <div className="cn-container cn-legal-body">
        <nav className="cn-legal-toc" aria-label={t('legalPage.toc')}>
          <h2>{t('legalPage.toc')}</h2>
          <ol>{doc.sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{text.sections[section.id].heading}</a></li>)}</ol>
        </nav>
        <div className="cn-legal-content">
          {slug === 'quyen-rieng-tu' ? <QualityConsent disclosure /> : null}
          <section className="cn-legal-summary" aria-labelledby="cn-legal-summary">
            <h2 id="cn-legal-summary">{t('legalPage.summary')}</h2>
            <ul className="cn-hub-checks">{doc.summary.map((point) => <li key={point}><Icon name="check-circle-fill" />{text.summary[point]}</li>)}</ul>
          </section>
          <ol className="cn-legal-sections">
            {doc.sections.map((section) => (
              <li key={section.id}>
                <section id={section.id} aria-labelledby={`${section.id}-title`}>
                  <h2 id={`${section.id}-title`}>{text.sections[section.id].heading}</h2>
                  {section.paragraphs?.map((id) => <p key={id}>{text.sections[section.id].paragraphs?.[id]}</p>)}
                  {section.items ? <ul>{section.items.map((id) => <li key={id}>{text.sections[section.id].items?.[id]}</li>)}</ul> : null}
                  {section.link ? <Link className="cn-legal-link" to={section.link.to}>{text.sections[section.id].link} <Icon name="arrow-right" /></Link> : null}
                </section>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}
