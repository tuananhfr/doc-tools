import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SiteBrand } from './SiteBrand'
import { FOOTER_LINKS, PRODUCT_LINKS } from '../config/site-navigation'
import { QualityConsent } from './QualityConsent'

export function SiteFooter() {
  const { t } = useTranslation('site')
  return (
    <footer className="cn-footer">
      <div className="cn-container cn-footer-content">
        <div className="cn-footer-brand"><SiteBrand compact /><span><Trans ns="site" i18nKey="footer.madeBy" components={{ link: <a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer" /> }} /></span></div>
        <nav aria-label={t('footer.navLabel')}>
          {FOOTER_LINKS.map((item) => <Link key={item.to} to={item.to}>{t(`footer.links.${item.id}`)}</Link>)}
        </nav>
        <span className="cn-footer-motto">{t('footer.motto')}</span>
        <QualityConsent />
      </div>
    </footer>
  )
}
