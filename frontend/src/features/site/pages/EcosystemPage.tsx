import Image from 'next/image'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { withBase } from '@/utils/url'
import { PRODUCT_LINKS } from '../config/site-navigation'
import { SitePageHero } from '../components/SitePageHero'
import { matchesEcosystemService, splitEcosystemTitle } from '../utils/ecosystem-page'

const CATEGORIES = ['all', 'free', 'work', 'life', 'business'] as const
type Category = (typeof CATEGORIES)[number]

const SERVICES = [
  { id: 'chuyenNho', icon: '/icons/chuyen nho.png', to: '/cong-cu', kind: 'internal', category: 'free' },
  { id: 'healthDigital', icon: '/icons/suc khoe so-01.png', to: 'https://suckhoeso.tekshot.ai', kind: 'external', category: 'work' },
  { id: 'healthBusiness', icon: '/icons/Sức Khỏe Doanh Nghiệp.png', to: 'https://suckhoedoanhnghiep.erpcons.ai', kind: 'external', category: 'business' },
  { id: 'family', icon: '/icons/lich gia dinh-01.png', to: '/gia-dinh', kind: 'internal', category: 'life' },
  { id: 'houseBook', icon: '/icons/So nha-01.png', to: '/huong-nha-la-ban', kind: 'internal', category: 'life' },
  { id: 'ubotBuild', icon: '/icons/ubot build.png', to: 'https://ubotbuild.com/', kind: 'external', category: 'work' },
  { id: 'ubotView', icon: '/icons/ubot view-01.png', to: '/hinh-anh', kind: 'internal', category: 'work' },
  { id: 'ubotConnect', icon: '/icons/ubot connect.png', to: '/he-sinh-thai#ubot-connect', kind: 'internal', category: 'business' },
  { id: 'tekshotOs', icon: '/icons/logo tekshot os sep gui tach nen.png', to: PRODUCT_LINKS.tekshot, kind: 'external', category: 'business' },
  { id: 'erpcons', icon: '/icons/logo erpcon tach nen.png', to: PRODUCT_LINKS.erpcons, kind: 'external', category: 'business' },
] as const

export default function EcosystemPage() {
  const { t } = useTranslation('site')
  const [activeCategory, setActiveCategory] = useState<Category>('all')
  const [keyword, setKeyword] = useState('')
  const title = t('ecosystemPage.title')
  const titleParts = splitEcosystemTitle(title)
  const visibleServices = SERVICES.filter((service) => {
    const text = `${t(`ecosystemPage.services.${service.id}.title`)} ${t(`ecosystemPage.services.${service.id}.description`)}`.toLocaleLowerCase()
    return matchesEcosystemService(service, activeCategory, keyword, text)
  })
  usePageTitle(t('pages.he-sinh-thai.title'))

  return (
    <div className="cn-site-page cn-ecosystem-page">
      <SitePageHero
        id="cn-ecosystem-page-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('ecosystemPage.trail') }]}
        title={<><span className="cn-ecosystem-page-kicker">{t('ecosystemPage.kicker')}</span>{titleParts ? <><span className="cn-ecosystem-page-title-line">{titleParts[0]}</span><span className="cn-ecosystem-page-title-line cn-ecosystem-page-title-line--accent">{titleParts[1]}</span></> : title}</>}
        tagline={t('ecosystemPage.tagline')}
        description={<p>{t('ecosystemPage.description')}</p>}
        art={<Image src={withBase('/brand/ecosystem.webp')} width={1536} height={1024} sizes="(max-width: 767px) 100vw, 620px" alt="" />}
      />

      <section className="cn-container cn-ecosystem-page-intro" aria-labelledby="cn-ecosystem-services-title">
        <div>
          <div className="cn-ecosystem-toolbar">
            <nav className="cn-ecosystem-category-tabs" aria-label={t('ecosystemPage.categoriesLabel')}>
          {CATEGORIES.map((category) => (
            <button key={category} type="button" className={activeCategory === category ? 'is-active' : undefined} aria-pressed={activeCategory === category} onClick={() => setActiveCategory(category)}>
              {t(`ecosystemPage.categories.${category}`)}
            </button>
          ))}
            </nav>
            <label className="cn-ecosystem-search">
              <span className="visually-hidden">{t('ecosystemPage.searchLabel')}</span>
              <Icon name="search" />
              <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder={t('ecosystemPage.searchPlaceholder')} />
            </label>
          </div>
        </div>
        <div className="cn-ecosystem-page-mark" aria-hidden="true"><Icon name="stars" /></div>
      </section>

      <section className="cn-container cn-ecosystem-service-grid" aria-label={t('ecosystemPage.servicesLabel')}>
        {visibleServices.map((service, index) => {
          const content = <><span className="cn-ecosystem-service-icon"><Image src={withBase(service.icon)} width={64} height={64} sizes="43px" alt="" /></span><span className="cn-ecosystem-service-copy"><strong>{t(`ecosystemPage.services.${service.id}.title`)}</strong><small>{t(`ecosystemPage.services.${service.id}.description`)}</small></span><Icon className="cn-ecosystem-service-arrow" name="arrow-right" /></>
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

    </div>
  )
}
