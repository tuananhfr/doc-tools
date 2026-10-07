import { useTranslation } from 'react-i18next'
import { withBase } from '@/utils/url'
import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import erpLogo from '@/assets/logo-full.png?url'
import { TEKSHOT_TRIAL_URL } from '@/features/tools/hub/config/pro-offer'
import { ProTrialTrigger } from '@/features/tools/hub/components/ProTrialTrigger'
import { PRODUCT_LINKS } from '../config/site-navigation'
import { MultilineText } from './MultilineText'

export function EcosystemSection() {
  const { t } = useTranslation('site')
  return (
    <section id="he-sinh-thai" className="cn-container cn-ecosystem" aria-labelledby="cn-ecosystem-title">
      <h2 id="cn-ecosystem-title">{t('ecosystem.title')}</h2>
      <p className="cn-section-description">{t('ecosystem.description')}</p>
      <div className="cn-product-grid">
        <article className="cn-product cn-product--erp">
          <Image className="cn-product-photo" src={withBase('/auth-background.jpg')} fill sizes="(max-width: 767px) 100vw, 50vw" alt="" />
          <div className="cn-product-content">
            <Image className="cn-product-logo cn-product-logo--erp" src={erpLogo} width={190} height={72} unoptimized alt="ERPCons Construction OS" />
            <h3>{t('ecosystem.erpcons.heading')}</h3>
            <p><MultilineText text={t('ecosystem.erpcons.modules')} /></p>
            <div className="cn-product-actions">
              <a className="cn-button cn-button--red" href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">{t('products.learnMore', { product: 'ERPCons' })}</a>
              <ProTrialTrigger className="cn-button cn-button--outline">{t('ecosystem.erpcons.trial')} <Icon name="arrow-right" /></ProTrialTrigger>
            </div>
          </div>
        </article>
        <article className="cn-product cn-product--tekshot">
          <Image className="cn-product-photo" src={withBase('/brand/tekshot-site-v1.png')} fill sizes="(max-width: 767px) 100vw, 50vw" alt="" />
          <div className="cn-product-content">
            <Image className="cn-product-logo cn-product-logo--tekshot" src={withBase('/brand/tekshot-ai-logo-dark.webp')} width={600} height={223} alt="TekShot AI" />
            <h3>{t('ecosystem.tekshot.heading')}</h3>
            <p><MultilineText text={t('ecosystem.tekshot.modules')} /></p>
            <div className="cn-product-actions">
              <ProTrialTrigger className="cn-button" url={TEKSHOT_TRIAL_URL} product="TekShot AI">{t('ecosystem.tekshot.trial')}</ProTrialTrigger>
              <a className="cn-button cn-button--outline" href={`${PRODUCT_LINKS.tekshot}/video`} target="_blank" rel="noopener noreferrer">{t('ecosystem.tekshot.demo')} <Icon name="arrow-right" /></a>
            </div>
          </div>
        </article>
      </div>
      <div id="ve-chuyen-nho" className="cn-ecosystem-story">
        <h3>{t('ecosystem.storyTitle')}</h3>
        <p>{t('ecosystem.story')}</p>
        <div className="cn-ecosystem-steps">
          <div><Image src={withBase('/brand/chuyen-nho-mark-v1.png')} width={64} height={64} alt="" /><span><strong>Chuyện Nhỏ</strong><small><MultilineText text={t('ecosystem.steps.chuyenNho')} /></small></span></div>
          <Icon className="cn-step-arrow" name="arrow-right" />
          <div><Icon name="buildings" /><span><strong>ERPCons</strong><small><MultilineText text={t('ecosystem.steps.erpcons')} /></small></span></div>
          <Icon className="cn-step-arrow" name="arrow-right" />
          <div><Icon name="cpu" /><span><strong>TekShot AI</strong><small><MultilineText text={t('ecosystem.steps.tekshot')} /></small></span></div>
          <p className="cn-ecosystem-motto"><MultilineText text={t('ecosystem.motto')} /></p>
        </div>
      </div>
    </section>
  )
}
