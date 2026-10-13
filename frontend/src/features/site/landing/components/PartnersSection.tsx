import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import erpLogo from '@/assets/logo-full.png?url'
import { withBase } from '@/utils/url'
import { ProTrialTrigger } from '@/features/tools/hub/components/ProTrialTrigger'
import { TEKSHOT_TRIAL_URL } from '@/features/tools/hub/config/pro-offer'
import { MultilineText } from '@/features/site/components/MultilineText'
import { PRODUCT_LINKS } from '@/features/site/config/site-navigation'

export function PartnersSection() {
  const { t } = useTranslation('site')

  return (
    <section className="cn-landing-partners cn-landing-container" aria-labelledby="cn-partners-title">
      <div className="cn-landing-partners-heading">
        <h2 id="cn-partners-title">{t('partners.title')}</h2>
        <span>{t('partners.disclosure')}</span>
      </div>
      <div className="cn-landing-partners-grid">
        <article className="cn-landing-partner cn-landing-partner--erp">
          <div className="cn-landing-partner-logo">
            <Image src={erpLogo} width={1052} height={400} unoptimized alt="ERPCons Construction OS" />
          </div>
          <h3>{t('ecosystem.erpcons.heading')}</h3>
          <p><MultilineText text={t('ecosystem.erpcons.modules')} /></p>
          <div className="cn-landing-partner-actions">
            <a className="cn-landing-button cn-landing-partner-primary" href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">
              {t('products.learnMore', { product: 'ERPCons' })}
            </a>
            <ProTrialTrigger className="cn-landing-button cn-landing-button--outline cn-landing-partner-secondary">
              {t('ecosystem.erpcons.trial')}
            </ProTrialTrigger>
          </div>
        </article>
        <article className="cn-landing-partner">
          <div className="cn-landing-partner-logo">
            <Image className="cn-landing-partner-logo--light" src={withBase('/brand/tekshot-ai-logo-light.webp')} width={440} height={162} alt="TekShot AI" />
            <Image className="cn-landing-partner-logo--dark" src={withBase('/brand/tekshot-ai-logo-dark.webp')} width={600} height={223} alt="TekShot AI" />
          </div>
          <h3>{t('ecosystem.tekshot.heading')}</h3>
          <p><MultilineText text={t('ecosystem.tekshot.modules')} /></p>
          <div className="cn-landing-partner-actions">
            <ProTrialTrigger className="cn-landing-button cn-landing-partner-primary" url={TEKSHOT_TRIAL_URL} product="TekShot AI">
              {t('ecosystem.tekshot.trial')}
            </ProTrialTrigger>
            <a className="cn-landing-button cn-landing-button--outline cn-landing-partner-secondary" href={`${PRODUCT_LINKS.tekshot}/video`} target="_blank" rel="noopener noreferrer">
              {t('ecosystem.tekshot.demo')}
            </a>
          </div>
        </article>
      </div>
    </section>
  )
}
