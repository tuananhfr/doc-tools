import Image from 'next/image'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import erpLogo from '@/assets/logo-full.png?url'
import { useHubStats } from '@/features/tools/hub/hooks/useHubStats'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { TOOL_FILTERS } from '@/features/tools/hub/config/tool-catalog'
import { withBase } from '@/utils/url'
import { SitePageHero } from '../components/SitePageHero'
import { READY_TOOL_COUNT } from '../config/home-content'
import { PRODUCT_LINKS } from '../config/site-navigation'
import { SITE_PAGE_META } from '../config/site-pages'

const VALUES = [
  { icon: 'gift', title: 'Miễn phí', detail: 'Dùng ngay, không chi phí ẩn' },
  { icon: 'lightning-charge', title: 'Không cần cài đặt', detail: 'Chạy ngay trên trình duyệt' },
  { icon: 'shield-check', title: 'Ưu tiên xử lý trên thiết bị', detail: 'Tệp của bạn ở lại trên máy' },
  { icon: 'heart', title: 'Đa lĩnh vực', detail: 'Công việc · Xây dựng · Gia đình' },
] as const

const PRODUCTS = [
  {
    id: 'chuyen-nho',
    name: 'Chuyện Nhỏ',
    role: 'Xử lý một việc',
    points: ['Công cụ miễn phí', 'Dùng ngay, không cần tài khoản', 'Không cần cài đặt', 'Cho công việc, xây dựng và gia đình'],
  },
  {
    id: 'erpcons',
    name: 'ERPCons',
    role: 'Quản lý công việc, dự án và doanh nghiệp',
    points: ['Công việc · Hợp đồng · Dự án', 'Chi phí · Mua hàng · Kho', 'Tài chính · Hồ sơ · Nhân sự', 'Trợ lý AI hỏi đáp dữ liệu'],
  },
  {
    id: 'tekshot',
    name: 'TekShot AI',
    role: 'AI nhìn, hiểu, làm và học cho doanh nghiệp',
    points: ['Camera AI · TekShot Vision', 'POS & Bán hàng · TekShot POS', 'Marketing AI · TekShot Studio', 'Research AI · TekShot Research'],
  },
] as const

// Bỏ mục "Tất cả": nó là bộ lọc, không phải một nhóm.
const GROUP_COUNT = TOOL_FILTERS.length - 1

export default function AboutPage() {
  usePageTitle(SITE_PAGE_META['ve-chung-toi'].title)
  const usage = useHubStats()[1]

  return (
    <div className="cn-site-page cn-about">
      <SitePageHero
        id="cn-about-title"
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Về Chuyện Nhỏ' }]}
        title={<>Về <span>Chuyện Nhỏ</span></>}
        tagline="Những việc nhỏ tạo nên giá trị lớn."
        description={(
          <>
            <p>Chuyện Nhỏ là bộ công cụ miễn phí từ ERPCons &amp; LPC, giúp bạn xử lý nhanh những việc nhỏ trong công việc, xây dựng và cuộc sống hằng ngày.</p>
            <p>Cần là dùng. Đơn giản. Hiệu quả. Không cần cài đặt, không cần tài khoản.</p>
          </>
        )}
        caption={'Cần một việc,\ndùng ngay!'}
        art={<Image src={withBase('/brand/documents-hero-v1.png')} width={1280} height={1280} sizes="(max-width: 1023px) 220px, 320px" alt="" preload />}
      >
        <div className="cn-page-actions">
          <Link className="cn-button" to="/cong-cu">Khám phá công cụ <Icon name="arrow-right" /></Link>
          <Link className="cn-button cn-button--ghost" to="/huong-dan">Xem hướng dẫn</Link>
        </div>
      </SitePageHero>

      <section className="cn-trust-strip" aria-label="Điều Chuyện Nhỏ cam kết">
        <ul className="cn-container cn-trust-items">
          {VALUES.map((item) => <li key={item.title}><Icon name={item.icon} /><div><strong>{item.title}</strong><span>{item.detail}</span></div></li>)}
        </ul>
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-about-ecosystem">
        <h2 id="cn-about-ecosystem">Một hệ sinh thái, nhiều giá trị hơn</h2>
        <p className="cn-section-description">Chuyện Nhỏ là một phần trong hệ sinh thái sản phẩm của ERPCons &amp; LPC.</p>
        <ol className="cn-about-products">
          {PRODUCTS.map((product) => (
            <li key={product.id} className={`cn-about-product cn-about-product--${product.id}`}>
              <div className="cn-about-product-head">
                {product.id === 'chuyen-nho' ? <Image src={withBase('/brand/chuyen-nho-mark-v1.png')} width={52} height={52} alt="" className="cn-about-logo-mark" /> : null}
                {product.id === 'erpcons' ? <Image src={erpLogo} width={110} height={42} unoptimized alt="" className="cn-about-logo-erp" /> : null}
                {product.id === 'tekshot' ? <Icon name="cpu" /> : null}
                <span><strong>{product.name}</strong><small>{product.role}</small></span>
              </div>
              <ul className="cn-hub-checks">{product.points.map((point) => <li key={point}><Icon name="check-circle-fill" />{point}</li>)}</ul>
            </li>
          ))}
        </ol>
        <div className="cn-about-story">
          <p className="cn-about-story-motto" aria-hidden="true">Từ những việc nhỏ hôm nay<br />đến những công việc lớn ngày mai.</p>
          <div>
            <p>Chuyện Nhỏ giúp bạn bắt đầu từ những việc nhỏ. Khi công việc phức tạp hơn, ERPCons và TekShot AI là nơi bạn quản lý, kết nối và mở rộng giá trị.</p>
            <div className="cn-page-actions">
              <a className="cn-button cn-button--red" href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">Tìm hiểu ERPCons <Icon name="arrow-up-right" /></a>
              <a className="cn-button" href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">Tìm hiểu TekShot AI <Icon name="arrow-up-right" /></a>
            </div>
          </div>
        </div>
      </section>

      <section className="cn-container cn-page-section" aria-label="Chuyện Nhỏ bằng con số">
        <dl className="cn-about-stats">
          <div><Icon name="grid" /><dt>công cụ miễn phí, dùng ngay</dt><dd>{READY_TOOL_COUNT}</dd></div>
          <div><Icon name="collection" /><dt>nhóm việc: tài liệu, ảnh, tính toán, xây dựng, gia đình…</dt><dd>{GROUP_COUNT}</dd></div>
          <div><Icon name="bar-chart" /><dt>{usage.label}</dt><dd>{usage.value}</dd></div>
        </dl>
      </section>
    </div>
  )
}
