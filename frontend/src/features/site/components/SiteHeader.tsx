import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { GuestPrefs } from '@/features/tools/hub/components/GuestPrefs'
import { SITE_NAVIGATION, PRODUCT_LINKS } from '../config/site-navigation'
import { MobileNavigation } from './MobileNavigation'
import { SiteBrand } from './SiteBrand'

export function SiteHeader({ showPreferences }: { showPreferences: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false)
  // So pathname thôi: router phía máy chủ không biết query/hash, so cả chuỗi là lệch hydrate.
  const location = useLocation()

  return (
    <header className="cn-header">
      <a className="cn-skip-link" href="#cn-main">Đi tới nội dung</a>
      <div className="cn-container cn-header-content">
        <SiteBrand />
        <nav className="cn-desktop-navigation" aria-label="Điều hướng chính">
          {SITE_NAVIGATION.map((item) => (
            <Link key={item.to} to={item.to} aria-current={location.pathname === item.to ? 'page' : location.pathname.startsWith(item.to + '/') ? 'true' : undefined}>{item.label}</Link>
          ))}
        </nav>
        <div className="cn-header-actions">
          {showPreferences ? <GuestPrefs /> : null}
          <Link className="cn-icon-button cn-header-search" to="/cong-cu#tim-cong-cu" aria-label="Tìm công cụ"><Icon name="search" /></Link>
          <div className="cn-header-products">
            <a className="cn-button cn-button--navy" href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">ERPCons</a>
            <a className="cn-button" href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">Tekshot OS</a>
          </div>
          <button className="cn-icon-button cn-menu-toggle" type="button" aria-label="Mở menu" aria-expanded={menuOpen} aria-controls="cn-mobile-navigation" onClick={() => setMenuOpen(true)}><Icon name="list" /></button>
        </div>
      </div>
      <MobileNavigation open={menuOpen} onClose={() => setMenuOpen(false)} />
    </header>
  )
}
