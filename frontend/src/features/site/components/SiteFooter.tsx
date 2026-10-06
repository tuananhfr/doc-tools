import { Link } from 'react-router-dom'
import { SiteBrand } from './SiteBrand'
import { FOOTER_LINKS, PRODUCT_LINKS } from '../config/site-navigation'

export function SiteFooter() {
  return (
    <footer className="cn-footer">
      <div className="cn-container cn-footer-content">
        <div className="cn-footer-brand"><SiteBrand compact /><span>Một sản phẩm từ <a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">ERPCons &amp; LPC</a></span></div>
        <nav aria-label="Điều hướng cuối trang">
          {FOOTER_LINKS.map((item) => <Link key={item.to} to={item.to}>{item.label}</Link>)}
        </nav>
        <span className="cn-footer-motto">Đồng hành cùng bạn.</span>
      </div>
    </footer>
  )
}
