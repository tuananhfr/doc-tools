import { Offcanvas } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { AccountButton } from '@/features/account'
import { SiteShare } from '@/features/site/components/SiteShare'
import { SITE_NAVIGATION, PRODUCT_LINKS } from '@/features/site/config/site-navigation'
import { LANDING_NAVIGATION } from '../config/landing-content'

export function LandingNavigation({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation('site')
  return (
    <Offcanvas id="cn-landing-menu" show={open} onHide={onClose} placement="end" className="cn-mobile-navigation cn-landing-menu" aria-labelledby="cn-landing-menu-title">
      <Offcanvas.Header closeButton><Offcanvas.Title id="cn-landing-menu-title">Chuyện Nhỏ</Offcanvas.Title></Offcanvas.Header>
      <Offcanvas.Body>
        <nav aria-label={t('header.mainNav')}>
          {LANDING_NAVIGATION.map(item => <Link key={item.key} to={item.hash} onClick={onClose}>{t(`landing.nav.${item.key}`)}</Link>)}
          {SITE_NAVIGATION.map(item => <Link key={item.id} to={item.to} onClick={onClose}>{t(`nav.${item.id}`)}</Link>)}
        </nav>
        <div className="cn-landing-menu-account"><AccountButton /><SiteShare /></div>
        <div className="cn-mobile-products"><a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">ERPCons</a><a href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">TekShot AI</a></div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
