import Image from 'next/image'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { LOCALES } from '@/i18n/locales'
import { withBase } from '@/utils/url'
import { ProductPreview } from './ProductPreview'

export function HeroSection() {
  const { t } = useTranslation('site')
  return (
    <section className="cn-landing-hero" aria-labelledby="cn-landing-title">
      <Image src={withBase('/landing/hero.webp')} alt="" fill loading="eager" fetchPriority="high" sizes="100vw" className="cn-landing-hero-art" />
      <div className="cn-landing-hero-copy cn-landing-container">
        <h1 id="cn-landing-title">{t('landing.hero.title')}<span>{t('landing.hero.highlight')}</span></h1>
        <p>{t('landing.hero.body')}</p>
        <div className="cn-landing-actions"><Link to="/cong-cu" className="cn-landing-button">{t('landing.openTools')}<Icon name="arrow-right" /></Link><Link to="#cach-dung" className="cn-landing-text-link">{t('landing.hero.how')}</Link></div>
        <Link to="#ngon-ngu-giao-dien" className="cn-landing-hero-note"><Icon name="globe2" />{t('landing.hero.languages', { total: LOCALES.length })}<span aria-hidden="true">·</span><Icon name="sun" /><Icon name="moon-stars" />{t('landing.hero.themes')}</Link>
      </div>
      <ProductPreview kind="pdf" preload />
    </section>
  )
}
