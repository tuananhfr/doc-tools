import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import erpLogo from '@/assets/logo-full.png?url'
import { withBase } from '@/utils/url'
import { ProTrialTrigger } from '@/features/tools/hub/components/ProTrialTrigger'
import { TEKSHOT_TRIAL_URL } from '@/features/tools/hub/config/pro-offer'
import { MultilineText } from './MultilineText'
import { PRODUCT_LINKS } from '../config/site-navigation'

export function PartnerBanner() {
  const { t } = useTranslation('site')

  return (
    <section className="cn-partner-banner" aria-labelledby="cn-partner-banner-title">
      <div className="cn-container cn-partner-banner__inner">
        <div className="cn-partner-banner__heading">
          <h2 id="cn-partner-banner-title">{t('partners.title')}</h2>
          <span>{t('partners.disclosure')}</span>
        </div>
        <div className="cn-partner-banner__grid">
          <article className="cn-partner-banner__card cn-partner-banner__card--erp">
            <div className="cn-partner-banner__logo">
              <Image src={erpLogo} width={1052} height={400} unoptimized alt="ERPCons Construction OS" />
            </div>
            <div className="cn-partner-banner__content">
              <h3>{t('about.products.erpcons.role')}</h3>
              <p><MultilineText text={t('ecosystem.erpcons.modules')} /></p>
              <div className="cn-partner-banner__actions">
                <a className="cn-button cn-button--red" href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">
                  {t('products.learnMore', { product: 'ERPCons' })}
                </a>
                <ProTrialTrigger className="cn-button cn-partner-banner__secondary">
                  {t('ecosystem.erpcons.trial')}
                </ProTrialTrigger>
              </div>
            </div>
          </article>
          <article className="cn-partner-banner__card">
            <div className="cn-partner-banner__logo">
              <Image className="cn-partner-banner__logo--light" src={withBase('/brand/tekshot-ai-logo-light.webp')} width={440} height={162} alt="TekShot AI" />
              <Image className="cn-partner-banner__logo--dark" src={withBase('/brand/tekshot-ai-logo-dark.webp')} width={600} height={223} alt="TekShot AI" />
            </div>
            <div className="cn-partner-banner__content">
              <h3>{t('about.products.tekshot.role')}</h3>
              <p><MultilineText text={t('ecosystem.tekshot.modules')} /></p>
              <div className="cn-partner-banner__actions">
                <ProTrialTrigger className="cn-button" url={TEKSHOT_TRIAL_URL} product="TekShot AI">
                  {t('ecosystem.tekshot.trial')}
                </ProTrialTrigger>
                <a className="cn-button cn-partner-banner__secondary" href={`${PRODUCT_LINKS.tekshot}/video`} target="_blank" rel="noopener noreferrer">
                  {t('ecosystem.tekshot.demo')}
                </a>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  )
}
