import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { FaqList } from '../components/FaqList'
import { SitePageHero } from '../components/SitePageHero'
import { ToolSearch } from '../components/ToolSearch'
import { SUPPORT_EMAIL } from '../config/site-navigation'
import { SITE_PAGE_META } from '../config/site-pages'
import { FAQ_ITEMS } from '../config/support-faq'
import { faqJsonLd, searchFaq } from '../utils/faq'

const TOPICS = [
  { icon: 'rocket-takeoff', title: 'Bắt đầu sử dụng', detail: 'Hướng dẫn từng bước', to: '/huong-dan' },
  { icon: 'file-earmark-pdf', title: 'Tài liệu & PDF', detail: 'Ghép, tách, nén, OCR', to: '/tai-lieu-pdf' },
  { icon: 'image', title: 'Hình ảnh', detail: 'Nén, đổi cỡ, xoá phông', to: '/cong-cu?nhom=image' },
  { icon: 'qr-code', title: 'QR & Mã vạch', detail: 'Tạo, đọc, in hàng loạt', to: '/cong-cu?nhom=data' },
  { icon: 'building', title: 'Xây dựng', detail: 'Khái toán, hướng nhà', to: '/xay-dung' },
  { icon: 'house-heart', title: 'Gia đình', detail: 'Lịch, nhắc việc, SOS', to: '/gia-dinh' },
  { icon: 'phone', title: 'Cài trên thiết bị', detail: 'Android, iPhone, máy tính', to: '/cai-dat' },
  { icon: 'shield-lock', title: 'Dữ liệu & quyền riêng tư', detail: 'Tệp được xử lý ở đâu', to: '/xu-ly-du-lieu' },
] as const

const FAQ_JSON_LD = faqJsonLd(FAQ_ITEMS)

export default function SupportPage() {
  usePageTitle(SITE_PAGE_META['ho-tro'].title)
  const [keyword, setKeyword] = useState('')
  const items = useMemo(() => searchFaq(FAQ_ITEMS, keyword), [keyword])

  return (
    <div className="cn-site-page cn-support">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }} />
      <SitePageHero
        id="cn-support-title"
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Hỗ trợ' }]}
        title={<>Chúng tôi có thể <span>giúp gì</span> cho bạn?</>}
        description={<p>Tìm câu trả lời nhanh trong các câu hỏi thường gặp, hoặc gửi thư cho chúng tôi.</p>}
        caption={'Hỏi nhanh,\nđáp gọn!'}
        art={<span className="cn-page-hero-icon"><Icon name="headset" /></span>}
      >
        <div className="cn-page-search">
          <ToolSearch
            id="tim-hoi-dap"
            label="Tìm câu hỏi"
            placeholder="Tìm câu hỏi… (ví dụ: cài đặt, lưu tệp, xoá dữ liệu)"
            keyword={keyword}
            onKeyword={setKeyword}
            onSubmit={() => document.getElementById('cn-support-faq')?.scrollIntoView({ block: 'start' })}
          />
        </div>
      </SitePageHero>

      <section className="cn-container cn-page-section" aria-labelledby="cn-support-topics">
        <h2 id="cn-support-topics">Chủ đề hỗ trợ</h2>
        <ul className="cn-topic-grid">
          {TOPICS.map((topic) => (
            <li key={topic.title}>
              <Link className="cn-topic" to={topic.to}>
                <Icon name={topic.icon} />
                <span><strong>{topic.title}</strong><small>{topic.detail}</small></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="cn-support-faq" className="cn-container cn-page-section" aria-labelledby="cn-support-faq-title">
        <h2 id="cn-support-faq-title">Câu hỏi thường gặp</h2>
        <p className="cn-section-description" role="status">{keyword ? `${items.length} câu hỏi cho “${keyword}”` : `${items.length} câu hỏi`}</p>
        {items.length > 0
          ? <FaqList items={items} />
          : <StateView icon="search" title="Chưa có câu hỏi nào khớp" description="Thử từ khoá khác, hoặc gửi thư để hỏi trực tiếp." actions={<button type="button" className="cn-button" onClick={() => setKeyword('')}>Xem tất cả câu hỏi</button>} />}
      </section>

      <section className="cn-container cn-page-section" aria-labelledby="cn-support-contact">
        <h2 id="cn-support-contact">Vẫn cần giúp đỡ?</h2>
        <div className="cn-contact-grid">
          <div className="cn-contact-card">
            <Icon name="envelope" />
            <div>
              <h3>Gửi thư cho chúng tôi</h3>
              <p>Ghi tên công cụ, trình duyệt bạn dùng và mô tả việc gặp phải. Đừng gửi kèm tệp có thông tin cá nhân.</p>
              <a className="cn-button" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
            </div>
          </div>
          <div className="cn-contact-card">
            <Icon name="lightbulb" />
            <div>
              <h3>Góp ý và đề xuất công cụ</h3>
              <p>Bạn cần một công cụ chưa có, hoặc muốn góp ý cho công cụ hiện tại? Gửi đề xuất và nhận mã biên nhận để theo dõi.</p>
              <Link className="cn-button cn-button--ghost" to="/de-xuat-tien-ich">Gửi đề xuất <Icon name="arrow-right" /></Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
