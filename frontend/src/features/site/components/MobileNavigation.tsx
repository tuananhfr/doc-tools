import { Offcanvas } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { SITE_NAVIGATION, PRODUCT_LINKS } from '../config/site-navigation'

interface MobileNavigationProps {
  open: boolean
  onClose: () => void
}

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const { t } = useTranslation('site')
  return (
    <Offcanvas id="cn-mobile-navigation" className="cn-mobile-navigation" show={open} onHide={onClose} placement="end" aria-labelledby="cn-navigation-title">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title id="cn-navigation-title">Chuyện Nhỏ</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <nav aria-label={t('header.mobileNav')}>
          {SITE_NAVIGATION.map((item) => <Link key={item.to} to={item.to} onClick={onClose}>{t(`nav.${item.id}`)}</Link>)}
        </nav>
        <div className="cn-mobile-products">
          <a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">ERPCons</a>
          <a href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">TekShot AI</a>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
