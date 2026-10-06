import { withBase } from '@/utils/url'
import Image from 'next/image'
import { Icon } from '@/components/ui/Icon'
import erpLogo from '@/assets/logo-full.png?url'
import { TEKSHOT_TRIAL_URL } from '@/features/tools/hub/config/pro-offer'
import { ProTrialTrigger } from '@/features/tools/hub/components/ProTrialTrigger'
import { PRODUCT_LINKS } from '../config/site-navigation'

export function EcosystemSection() {
  return (
    <section id="he-sinh-thai" className="cn-container cn-ecosystem" aria-labelledby="cn-ecosystem-title">
      <h2 id="cn-ecosystem-title">Khi một công cụ là chưa đủ…</h2>
      <p className="cn-section-description">Từ những việc nhỏ hôm nay, đến công việc lớn hơn ngày mai.</p>
      <div className="cn-product-grid">
        <article className="cn-product cn-product--erp">
          <Image className="cn-product-photo" src={withBase('/auth-background.jpg')} fill sizes="(max-width: 767px) 100vw, 50vw" alt="" />
          <div className="cn-product-content">
            <Image className="cn-product-logo cn-product-logo--erp" src={erpLogo} width={190} height={72} unoptimized alt="ERPCons Construction OS" />
            <h3>Quản lý công việc, dự án và doanh nghiệp xây dựng trên một nền tảng.</h3>
            <p>Công việc · Hợp đồng · Dự án<br />Chi phí · Mua hàng · Kho · Tài chính</p>
            <div className="cn-product-actions">
              <a className="cn-button cn-button--red" href={PRODUCT_LINKS.erpcons} target="_blank" rel="noopener noreferrer">Tìm hiểu ERPCons</a>
              <ProTrialTrigger className="cn-button cn-button--outline">Dùng thử <Icon name="arrow-right" /></ProTrialTrigger>
            </div>
          </div>
        </article>
        <article className="cn-product cn-product--tekshot">
          <Image className="cn-product-photo" src={withBase('/brand/tekshot-site-v1.png')} fill sizes="(max-width: 767px) 100vw, 50vw" alt="" />
          <div className="cn-product-content">
            <Image className="cn-product-logo cn-product-logo--tekshot" src={withBase('/brand/tekshot-ai-logo-dark.webp')} width={600} height={223} alt="TekShot AI" />
            <h3>Nền tảng AI &amp; Software giúp doanh nghiệp nhìn thấy, hiểu sâu, tự động hóa và tăng trưởng.</h3>
            <p>Camera AI · Bán hàng &amp; POS · Marketing AI<br />Research AI · Một nền tảng, mọi dữ liệu</p>
            <div className="cn-product-actions">
              <ProTrialTrigger className="cn-button" url={TEKSHOT_TRIAL_URL} product="TekShot AI">Dùng thử miễn phí</ProTrialTrigger>
              <a className="cn-button cn-button--outline" href={`${PRODUCT_LINKS.tekshot}/video`} target="_blank" rel="noopener noreferrer">Xem demo <Icon name="arrow-right" /></a>
            </div>
          </div>
        </article>
      </div>
      <div id="ve-chuyen-nho" className="cn-ecosystem-story">
        <h3>Cùng một hệ sinh thái. Nhiều giá trị hơn.</h3>
        <p>Chuyện Nhỏ là bộ công cụ miễn phí từ ERPCons &amp; LPC, giúp bạn xử lý nhanh những việc nhỏ hằng ngày.</p>
        <div className="cn-ecosystem-steps">
          <div><Image src={withBase('/brand/chuyen-nho-mark-v1.png')} width={64} height={64} alt="" /><span><strong>Chuyện Nhỏ</strong><small>Cần một việc nhỏ.<br />Dùng ngay.</small></span></div>
          <Icon className="cn-step-arrow" name="arrow-right" />
          <div><Icon name="buildings" /><span><strong>ERPCons</strong><small>Quản lý công việc,<br />dự án và doanh nghiệp.</small></span></div>
          <Icon className="cn-step-arrow" name="arrow-right" />
          <div><Icon name="cpu" /><span><strong>TekShot AI</strong><small>AI nhìn, hiểu, làm và học<br />cho doanh nghiệp.</small></span></div>
          <p className="cn-ecosystem-motto">Làm việc nhẹ hơn.<br />Mỗi ngày tốt hơn.</p>
        </div>
      </div>
    </section>
  )
}
