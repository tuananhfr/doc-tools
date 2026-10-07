import { useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { FaqList } from '../components/FaqList'
import { SitePageHero } from '../components/SitePageHero'
import { ToolSearch } from '../components/ToolSearch'
import { SUPPORT_EMAIL } from '../config/site-navigation'
import { FAQ_ITEMS } from '../config/support-faq'
import { faqJsonLd, localizeFaq, searchFaq } from '../utils/faq'
import { QualityConsent } from '../components/QualityConsent'

const TOPICS = [
  { id: 'start', icon: 'rocket-takeoff', to: '/huong-dan' },
  { id: 'documents', icon: 'file-earmark-pdf', to: '/tai-lieu-pdf' },
  { id: 'image', icon: 'image', to: '/cong-cu?nhom=image' },
  { id: 'qr', icon: 'qr-code', to: '/cong-cu?nhom=data' },
  { id: 'construction', icon: 'building', to: '/xay-dung' },
  { id: 'family', icon: 'house-heart', to: '/gia-dinh' },
  { id: 'install', icon: 'phone', to: '/cai-dat' },
  { id: 'privacy', icon: 'shield-lock', to: '/xu-ly-du-lieu' },
] as const

export default function SupportPage() {
  const { t } = useTranslation('site')
  usePageTitle(t('pages.ho-tro.title'))
  const [keyword, setKeyword] = useState('')
  const faq = useMemo(() => localizeFaq(t, FAQ_ITEMS), [t])
  const faqJson = useMemo(() => faqJsonLd(faq), [faq])
  const items = useMemo(() => searchFaq(faq, keyword), [faq, keyword])

  return (
    <div className="cn-site-page cn-support">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJson }} />
      <SitePageHero
        id="cn-support-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('support.trail') }]}
        title={<Trans ns="site" i18nKey="support.title" components={{ accent: <span /> }} />}
        description={<p>{t('support.intro')}</p>}
        caption={t('support.caption')}
        art={<span className="cn-page-hero-icon"><Icon name="headset" /></span>}
      >
        <div className="cn-page-search">
          <ToolSearch
            id="tim-hoi-dap"
            label={t('support.searchLabel')}
            placeholder={t('support.searchPlaceholder')}
            keyword={keyword}
            onKeyword={setKeyword}
            onSubmit={() => document.getElementById('cn-support-faq')?.scrollIntoView({ block: 'start' })}
          />
        </div>
      </SitePageHero>

      <section className="cn-container cn-page-section" aria-labelledby="cn-support-topics">
        <h2 id="cn-support-topics">{t('support.topicsTitle')}</h2>
        <ul className="cn-topic-grid">
          {TOPICS.map((topic) => (
            <li key={topic.id}>
              <Link className="cn-topic" to={topic.to}>
                <Icon name={topic.icon} />
                <span><strong>{t(`support.topics.${topic.id}.title`)}</strong><small>{t(`support.topics.${topic.id}.detail`)}</small></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="cn-support-faq" className="cn-container cn-page-section" aria-labelledby="cn-support-faq-title">
        <QualityConsent disclosure />
        <h2 id="cn-support-faq-title">{t('support.faqTitle')}</h2>
        <p className="cn-section-description" role="status">{keyword ? t('support.faqCountFor', { count: items.length, keyword }) : t('support.faqCount', { count: items.length })}</p>
        {items.length > 0
          ? <FaqList items={items} />
          : <StateView icon="search" title={t('support.emptyTitle')} description={t('support.emptyHint')} actions={<button type="button" className="cn-button" onClick={() => setKeyword('')}>{t('support.showAll')}</button>} />}
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-support-contact">
        <h2 id="cn-support-contact">{t('support.contactTitle')}</h2>
        <div className="cn-contact-grid">
          <div className="cn-contact-card">
            <Icon name="envelope" />
            <div>
              <h3>{t('support.mailTitle')}</h3>
              <p>{t('support.mailBody')}</p>
              <a className="cn-button" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </div>
          </div>
          <div className="cn-contact-card">
            <Icon name="lightbulb" />
            <div>
              <h3>{t('support.suggestTitle')}</h3>
              <p>{t('support.suggestBody')}</p>
              <Link className="cn-button cn-button--ghost" to="/de-xuat-tien-ich">{t('support.suggestAction')} <Icon name="arrow-right" /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
