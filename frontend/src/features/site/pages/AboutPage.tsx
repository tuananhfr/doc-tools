import Image from 'next/image'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import erpLogo from '@/assets/logo-full.png?url'
import { useHubStats } from '@/features/tools/hub/hooks/useHubStats'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { TOOL_FILTERS } from '@/features/tools/hub/config/tool-catalog'
import { withBase } from '@/utils/url'
import { MultilineText } from '../components/MultilineText'
import { SitePageHero } from '../components/SitePageHero'
import { READY_TOOL_COUNT } from '../config/home-content'
import { PRODUCT_LINKS } from '../config/site-navigation'

const VALUES = [
  { id: 'free', icon: 'gift' },
  { id: 'noInstall', icon: 'lightning-charge' },
  { id: 'onDevice', icon: 'shield-check' },
  { id: 'domains', icon: 'heart' },
] as const

const PRODUCTS = [
  { id: 'chuyen-nho', name: 'Chuyện Nhỏ', points: ['free', 'noAccount', 'noInstall', 'domains'] },
  { id: 'erpcons', name: 'ERPCons', points: ['work', 'cost', 'finance', 'ai'] },
  { id: 'tekshot', name: 'TekShot AI', points: ['vision', 'pos', 'studio', 'research'] },
] as const

// Bỏ mục "Tất cả": nó là bộ lọc, không phải một nhóm.
const GROUP_COUNT = TOOL_FILTERS.length - 1

export default function AboutPage() {
  const { t } = useTranslation('site')
  usePageTitle(t('pages.ve-chung-toi.title'))
  const products = t('about.products', { returnObjects: true }) as Record<string, { role: string; points: Record<string, string> }>
  const usage = useHubStats()[1]

  return (
    <div className="cn-site-page cn-about">
      <SitePageHero
        id="cn-about-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('about.trail') }]}
        title={<Trans ns="site" i18nKey="about.title" components={{ accent: <span /> }} />}
        tagline={t('about.tagline')}
        description={(
          <>
            <p>{t('about.intro')}</p>
            <p>{t('about.introMore')}</p>
          </>
        )}
        caption={t('about.caption')}
        art={<Image src={withBase('/brand/documents-hero-v1.png')} width={1280} height={1280} sizes="(max-width: 1023px) 220px, 320px" alt="" preload />}
      >
        <div className="cn-page-actions">
          <Link className="cn-button" to="/cong-cu">{t('about.explore')} <Icon name="arrow-right" /></Link>
          <Link className="cn-button cn-button--ghost" to="/huong-dan">{t('about.guides')}</Link>
        </div>
      </SitePageHero>

      <section className="cn-trust-strip" aria-label={t('about.valuesLabel')}>
        <ul className="cn-container cn-trust-items">
          {VALUES.map((item) => <li key={item.id}><Icon name={item.icon} /><div><strong>{t(`about.values.${item.id}.title`)}</strong><span>{t(`about.values.${item.id}.detail`)}</span></div></li>)}
        </ul>
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-about-ecosystem">
        <h2 id="cn-about-ecosystem">{t('about.ecosystemTitle')}</h2>
        <p className="cn-section-description">{t('about.ecosystemDescription')}</p>
        <ol className="cn-about-products">
          {PRODUCTS.map((product) => (
            <li key={product.id} className={`cn-about-product cn-about-product--${product.id}`}>
              <div className="cn-about-product-head">
                {product.id === 'chuyen-nho' ? <Image src={withBase('/brand/chuyen-nho-mark-v1.png')} width={52} height={52} alt="" className="cn-about-logo-mark" /> : null}
                {product.id === 'erpcons' ? <Image src={erpLogo} width={110} height={42} unoptimized alt="" className="cn-about-logo-erp" /> : null}
                {product.id === 'tekshot' ? <Icon name="cpu" /> : null}
                <span><strong>{product.name}</strong><small>{products[product.id].role}</small></span>
              </div>
              <ul className="cn-hub-checks">{product.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{products[product.id].points[point]}</li>)}</ul>
            </li>
          ))}
        </ol>
        <div className="cn-about-story">
          <p className="cn-about-story-motto" aria-hidden="true"><MultilineText text={t('about.storyMotto')} /></p>
          <div>
            <p>{t('about.story')}</p>
            <div className="cn-page-actions">
              <a className="cn-button cn-button--red" href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">{t('products.learnMore', { product: 'ERPCons' })} <Icon name="arrow-up-right" /></a>
              <a className="cn-button" href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">{t('products.learnMore', { product: 'TekShot AI' })} <Icon name="arrow-up-right" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="cn-container cn-page-section" aria-label={t('about.statsLabel')}>
        <dl className="cn-about-stats">
          <div><Icon name="grid" /><dt>{t('about.stats.tools')}</dt><dd>{READY_TOOL_COUNT}</dd></div>
          <div><Icon name="collection" /><dt>{t('about.stats.groups')}</dt><dd>{GROUP_COUNT}</dd></div>
          <div><Icon name="bar-chart" /><dt>{usage.label}</dt><dd>{usage.value}</dd></div>
        </dl>
      </section>
    </div>
  )
}
