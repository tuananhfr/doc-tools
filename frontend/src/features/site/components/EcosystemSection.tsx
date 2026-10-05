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
            <Image className="cn-product-logo cn-product-logo--tekshot" src={withBase('/logo-tekshot.png')} width={178} height={87} alt="TekShot" />
            <h3>Kết nối camera, hiện trường và vận hành trong một hệ sinh thái.</h3>
            <p>Tekshot OS<br />Nhìn thực tế. Tạo giá trị thật.</p>
            <div className="cn-product-actions">
              <a className="cn-button" href={PRODUCT_LINKS.tekshot} target="_blank" rel="noopener noreferrer">Tìm hiểu Tekshot OS</a>
              <ProTrialTrigger className="cn-button cn-button--outline" url={TEKSHOT_TRIAL_URL} product="TekshotOS">Dùng thử <Icon name="arrow-right" /></ProTrialTrigger>
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
          <div><Icon name="camera-video" /><span><strong>Tekshot OS</strong><small>Kết nối và vận hành<br />thế giới thực.</small></span></div>
          <p className="cn-ecosystem-motto">Làm việc nhẹ hơn.<br />Mỗi ngày tốt hơn.</p>
        </div>
      </div>
    </section>
  )
}
