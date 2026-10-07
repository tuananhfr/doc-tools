import { Offcanvas } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useMe } from '@/features/account'
import { ADMIN_ROOT } from '@/features/admin'
import { withBase } from '@/utils/url'
import { SITE_NAVIGATION, PRODUCT_LINKS } from '../config/site-navigation'

interface MobileNavigationProps {
  open: boolean
  onClose: () => void
}

export function MobileNavigation({ open, onClose }: MobileNavigationProps) {
  const { t } = useTranslation('site')
  const { data } = useMe()
  return (
    <Offcanvas id="cn-mobile-navigation" className="cn-mobile-navigation" show={open} onHide={onClose} placement="end" aria-labelledby="cn-navigation-title">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title id="cn-navigation-title">Chuyện Nhỏ</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <nav aria-label={t('header.mobileNav')}>
          {SITE_NAVIGATION.map((item) => <Link key={item.to} to={item.to} onClick={onClose}>{t(`nav.${item.id}`)}</Link>)}
        </nav>
        {data ? (
          <div className="cn-mobile-account">
            <Link to={data.user ? '/tai-khoan' : '/dang-nhap'} onClick={onClose}>{data.user ? t('header.account') : t('header.signIn')}</Link>
            {data.user ? <span className="cn-mobile-account__email">{data.user.email}</span> : null}
            {data.staff ? <a href={withBase(ADMIN_ROOT)}>Quản trị</a> : null}
          </div>
        ) : null}
        <div className="cn-mobile-products">
          <a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">ERPCons</a>
          <a href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">TekShot AI</a>
        </div>
      </Offcanvas.Body>
    </Offcanvas>
  )
}
