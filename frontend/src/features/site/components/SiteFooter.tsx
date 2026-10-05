import { Link } from 'react-router-dom'
import { SiteBrand } from './SiteBrand'
import { PRODUCT_LINKS } from '../config/site-navigation'

export function SiteFooter() {
  return (
    <footer className="cn-footer">
      <div className="cn-container cn-footer-content">
        <div className="cn-footer-brand"><SiteBrand compact /><span>Một sản phẩm từ <a href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">ERPCons &amp; LPC</a></span></div>
        <nav aria-label="Điều hướng cuối trang">
          <Link to="/cong-cu">Tất cả công cụ</Link>
          <Link to="/#ve-chuyen-nho">Về Chuyện Nhỏ</Link>
          <Link to="/#du-lieu">Tệp của bạn</Link>
        </nav>
        <span className="cn-footer-motto">Đồng hành cùng bạn.</span>
      </div>
    </footer>
  )
}
