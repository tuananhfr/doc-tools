import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { withBase } from '@/utils/url'
import { ECOSYSTEM_GROUPS } from '../config/ecosystem'
import { SitePageHero } from '../components/SitePageHero'

export default function EcosystemPage() {
  const { t } = useTranslation('site')
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
        <div><h2 id="cn-ecosystem-services-title">{t('ecosystemPage.servicesTitle')}</h2>
          <nav className="cn-ecosystem-group-nav" aria-label={t('ecosystemPage.servicesLabel')}>
            {ECOSYSTEM_GROUPS.map(group => <a key={group.id} href={'#' + group.id}><span>{group.number}</span>{t(`ecosystemPage.catalog.groups.${group.id}.title`)}</a>)}
          </nav>
        </div>
      </section>
      <div className="cn-container cn-ecosystem-directory">
        {ECOSYSTEM_GROUPS.map(group => <section key={group.id} id={group.id} className="cn-ecosystem-group" aria-labelledby={'cn-ecosystem-' + group.id}>
          <div className="cn-ecosystem-group-heading"><span>{group.number}</span><div><h2 id={'cn-ecosystem-' + group.id}>{t(`ecosystemPage.catalog.groups.${group.id}.title`)}</h2><p>{t(`ecosystemPage.catalog.groups.${group.id}.description`)}</p></div><small>{String(group.items.length).padStart(2, '0')}</small></div>
          <div className="cn-ecosystem-catalog-grid">{group.items.map(item => {
            const content = <><span className="cn-ecosystem-catalog-logo"><Image src={withBase('/brand/ecosystem/' + item.logo)} width={88} height={88} unoptimized alt="" /></span><span className="cn-ecosystem-catalog-copy">{item.featured && <span className="cn-ecosystem-current">{t('ecosystemPage.catalog.current')}</span>}<strong>{t(`ecosystemPage.catalog.items.${item.id}.name`)}</strong><small>{t(`ecosystemPage.catalog.items.${item.id}.description`)}</small>{!item.href && <span className="cn-ecosystem-no-link">{t('ecosystemPage.catalog.noLink')}</span>}</span>{item.href && <Icon className="cn-ecosystem-catalog-arrow" name="arrow-up-right" />}</>
            const className = 'cn-ecosystem-catalog-card' + (item.featured ? ' is-current' : '')
            return item.href ? <a key={item.id} id={item.id === 'ubotConnect' ? 'ubot-connect' : undefined} className={className} href={item.href} target="_blank" rel="noopener noreferrer">{content}</a> : <article key={item.id} className={className}>{content}</article>
          })}</div>
        </section>)}
      </div>
      <section className="cn-container cn-ecosystem-page-footer" aria-label={t('ecosystemPage.footerLabel')}><p>{t('ecosystemPage.footer')}</p><Link className="cn-button" to="/">{t('ecosystemPage.openTools')} <Icon name="arrow-right" /></Link></section>
    </div>
  )
}
