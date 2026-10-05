import { Icon } from '@/components/ui'
import { useToolsBranch } from '../hooks/tools-branch'
import { useGuestSessionAction } from '../hooks/useGuestSessionAction'
import { GuestPrefs } from './GuestPrefs'
import { GuestSessionAction } from './GuestSessionAction'
import { HeroStats } from './HeroStats'
import { HeroTrialActions } from './HeroTrialActions'

const PROMISES = ['Không cần tài khoản', 'Không cần cài đặt', 'Dùng trên trình duyệt hoặc web app', 'Tệp xử lý trên máy bạn', 'Hỗ trợ công việc hàng ngày']

/** Dải giới thiệu đầu trang chọn công cụ. */
export function ToolsHero() {
  const action = useGuestSessionAction()
  const { kind } = useToolsBranch()
  // Chỉ nút "Mở trong ERPcons" mới chờ phiên; "Đăng nhập" không vẽ ở đây — trang này để mời dùng thử.
  const openInApp = action?.openInApp ? action : null

  return (
    <section className="erp-tools-hero" aria-labelledby="erp-tools-hero-title">
      <div className={`erp-tools-hero__top${openInApp ? ' erp-tools-hero__top--row' : ''}`}>
        <div className="erp-tools-hero__head">
          <p className="erp-tools-hero__brand">By ERPcons &amp; LPC</p>
          {kind === 'public' ? <GuestPrefs onHero /> : null}
        </div>
        {kind === 'public' ? (
          <HeroTrialActions>{openInApp ? <GuestSessionAction action={openInApp} className="erp-tools-hero__action" /> : null}</HeroTrialActions>
        ) : null}
      </div>

      <div className="erp-tools-hero__intro">
        <h1 id="erp-tools-hero-title" className="erp-tools-hero__title">
          Chuyện Nhỏ
          <span className="erp-tools-hero__badge">Free tools</span>
        </h1>
        <p className="erp-tools-hero__tagline">Công cụ miễn phí. Cần là dùng.</p>
        <p className="erp-tools-hero__lead">Những tiện ích đơn giản, thiết thực cho công việc hàng ngày.</p>
      </div>

      <p className="erp-tools-hero__motto">Việc lớn bắt đầu từ chuyện nhỏ.</p>

      <ul className="erp-tools-hero__promises">
        {PROMISES.map((promise) => (
          <li key={promise}>
            <Icon name="check-circle-fill" />
            {promise}
          </li>
        ))}
      </ul>

      <HeroStats />
    </section>
  )
}
