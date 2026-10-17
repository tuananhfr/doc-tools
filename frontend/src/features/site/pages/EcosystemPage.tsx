import Image from 'next/image'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { withBase } from '@/utils/url'
import { PRODUCT_LINKS } from '../config/site-navigation'
import { SitePageHero } from '../components/SitePageHero'

const CATEGORIES = ['all', 'free', 'work', 'life', 'business'] as const
type Category = (typeof CATEGORIES)[number]

const SERVICES = [
  { id: 'chuyenNho', icon: 'clipboard2-pulse', to: '/cong-cu', kind: 'internal', category: 'free' },
  { id: 'healthDigital', icon: 'heart-pulse', to: 'https://suckhoeso.tekshot.ai', kind: 'external', category: 'work' },
  { id: 'healthBusiness', icon: 'bar-chart-line', to: 'https://suckhoedoanhnghiep.erpcons.ai', kind: 'external', category: 'business' },
  { id: 'family', icon: 'calendar-heart', to: '/gia-dinh', kind: 'internal', category: 'life' },
  { id: 'houseBook', icon: 'house', to: '/huong-nha-la-ban', kind: 'internal', category: 'life' },
  { id: 'ubotBuild', icon: 'cone-striped', to: '/xay-dung', kind: 'internal', category: 'work' },
  { id: 'ubotView', icon: 'camera', to: '/hinh-anh', kind: 'internal', category: 'work' },
  { id: 'ubotConnect', icon: 'share', to: '/he-sinh-thai#ubot-connect', kind: 'internal', category: 'business' },
  { id: 'tekshotOs', icon: 'film', to: PRODUCT_LINKS.tekshot, kind: 'external', category: 'business' },
  { id: 'erpcons', icon: 'buildings', to: PRODUCT_LINKS.erpcons, kind: 'external', category: 'business' },
] as const

export default function EcosystemPage() {
  const { t } = useTranslation('site')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  usePageTitle(t('pages.he-sinh-thai.title'))

  return (
    <div className="cn-site-page cn-ecosystem-page">
      <SitePageHero
        id="cn-ecosystem-page-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('ecosystemPage.trail') }]}
        title={<><span className="cn-ecosystem-page-kicker">{t('ecosystemPage.kicker')}</span>{t('ecosystemPage.title')}</>}
        tagline={t('ecosystemPage.tagline')}
        description={<p>{t('ecosystemPage.description')}</p>}
        art={<Image src={withBase('/brand/skyline-hero-v1.png')} width={720} height={320} sizes="(max-width: 767px) 100vw, 520px" alt="" />}
      />

      <section className="cn-container cn-ecosystem-page-intro" aria-labelledby="cn-ecosystem-services-title">
        <div>
          <h2 id="cn-ecosystem-services-title">{t('ecosystemPage.servicesTitle')}</h2>
          <nav className="cn-ecosystem-category-tabs" aria-label={t('ecosystemPage.categoriesLabel')}>
            {CATEGORIES.map((category) => (
              <button key={category} type="button" className={activeCategory === category ? 'is-active' : undefined} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>
                {t(`ecosystemPage.categories.${category}`)}
              </button>
            ))}
          </nav>
        </div>
        <div className="cn-ecosystem-page-mark" aria-hidden="true"><Icon name="stars" /></div>
      </section>

      <section className="cn-container cn-ecosystem-service-grid" aria-label={t('ecosystemPage.servicesLabel')}>
        {SERVICES.filter(service => activeCategory === 'all' || service.category === activeCategory).map((service, index) => {
          const content = <><span className="cn-ecosystem-service-icon"><Icon name={service.icon} /></span><span className="cn-ecosystem-service-copy"><strong>{t(`ecosystemPage.services.${service.id}.title`)}</strong><small>{t(`ecosystemPage.services.${service.id}.description`)}</small></span><Icon className="cn-ecosystem-service-arrow" name={service.kind === 'external' ? 'arrow-up-right' : 'arrow-right'} /></>
          return service.kind === 'external'
            ? <a className={`cn-ecosystem-service-card cn-ecosystem-service-card--${index % 5}`} key={service.id} href={service.to} target="_blank" rel="noopener noreferrer">{content}</a>
            : <Link id={service.id === 'ubotConnect' ? 'ubot-connect' : undefined} className={`cn-ecosystem-service-card cn-ecosystem-service-card--${index % 5}`} key={service.id} to={service.to}>{content}</Link>
        })}
        {activeCategory === 'all' && <div className="cn-ecosystem-service-card cn-ecosystem-service-card--more">
          <span className="cn-ecosystem-service-icon"><Icon name="stars" /></span>
          <span className="cn-ecosystem-service-copy"><strong>{t('ecosystemPage.more.title')}</strong><small>{t('ecosystemPage.more.description')}</small></span>
          <Icon className="cn-ecosystem-service-arrow" name="arrow-right" />
        </div>}
      </section>

      <section className="cn-container cn-ecosystem-page-footer" aria-label={t('ecosystemPage.footerLabel')}>
        <p>{t('ecosystemPage.footer')}</p>
        <Link className="cn-button" to="/cong-cu">{t('ecosystemPage.openTools')} <Icon name="arrow-right" /></Link>
      </section>
    </div>
  )
}
