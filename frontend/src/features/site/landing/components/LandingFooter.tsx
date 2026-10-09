import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SiteBrand } from '@/features/site/components/SiteBrand'
import { QualityConsent } from '@/features/site/components/QualityConsent'
import { FOOTER_LINKS, PRODUCT_LINKS } from '@/features/site/config/site-navigation'

export function LandingFooter() {
  const { t } = useTranslation('site')
  return (
    <footer className="cn-landing-footer"><div className="cn-landing-container">
      <div className="cn-landing-footer-main"><div><SiteBrand /><p>{t('landing.footer.tagline')}</p></div><nav aria-label={t('footer.navLabel')}>{FOOTER_LINKS.map(item => <Link key={item.id} to={item.to}>{t(`footer.links.${item.id}`)}</Link>)}</nav></div>
      <div className="cn-landing-footer-bottom"><span><Trans ns="site" i18nKey="landing.footer.madeBy" components={{ productLink: <a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer" /> }} /></span><div className="cn-landing-ecosystem-links"><a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">ERPCons</a><a href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">TekShot AI</a></div><QualityConsent /></div>
    </div></footer>
  )
}
