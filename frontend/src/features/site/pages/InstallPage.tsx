import { useEffect, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { appConfig } from '@/config/app.config'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { withBase } from '@/utils/url'
import { SitePageHero } from '../components/SitePageHero'
import { detectInstallPlatform, INSTALL_PLATFORMS, INSTALL_TROUBLESHOOTING, type InstallPlatformId } from '../config/install-guide'
import { SITE_PAGE_META } from '../config/site-pages'

const BENEFITS = [
  { icon: 'lightning-charge', label: 'Mở nhanh từ màn hình chính' },
  { icon: 'arrows-fullscreen', label: 'Toàn màn hình, không thanh địa chỉ' },
  { icon: 'shop', label: 'Không cần vào kho ứng dụng' },
  { icon: 'gift', label: 'Miễn phí' },
] as const

export default function InstallPage() {
  usePageTitle(SITE_PAGE_META['cai-dat'].title)
  const [active, setActive] = useState<InstallPlatformId>('android')
  const [address, setAddress] = useState(() => appConfig.siteUrl.replace(/^https?:\/\//, '') + withBase('/'))

  // Đoán nền tảng sau hydrate: HTML tĩnh luôn vẽ thẻ Android để khớp lần vẽ đầu.
  useEffect(() => {
    const touchMac = /macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1
    setActive(touchMac ? 'ios' : detectInstallPlatform(navigator.userAgent))
    setAddress(window.location.host + withBase('/'))
  }, [])

  const onTabKey = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0
    if (!step) return
    event.preventDefault()
    const next = INSTALL_PLATFORMS[(index + step + INSTALL_PLATFORMS.length) % INSTALL_PLATFORMS.length]
    setActive(next.id)
    document.getElementById(`cn-install-tab-${next.id}`)?.focus()
  }

  const platform = INSTALL_PLATFORMS.find((item) => item.id === active) ?? INSTALL_PLATFORMS[0]

  return (
    <div className="cn-site-page cn-install">
      <SitePageHero
        id="cn-install-title"
        trail={[{ label: 'Trang chủ', to: '/' }, { label: 'Cài trên thiết bị' }]}
        title={<>Cài Chuyện Nhỏ <span>trên thiết bị</span></>}
        tagline="Dùng như một ứng dụng. Mở nhanh. Tiện hơn mỗi ngày."
        description={<p>Chuyện Nhỏ là ứng dụng web: thêm vào màn hình chính hoặc Dock là mở được ngay, không cần tìm lại trang trong trình duyệt.</p>}
        caption={'Cài một lần,\ndùng tiện mỗi ngày!'}
        art={<span className="cn-install-phone"><Image src={withBase('/icons/icon-192.png')} width={96} height={96} alt="" /><b>Chuyện Nhỏ</b></span>}
      >
        <ul className="cn-page-points">{BENEFITS.map((item) => <li key={item.label}><Icon name={item.icon} />{item.label}</li>)}</ul>
      </SitePageHero>

      <section className="cn-container cn-page-section" aria-labelledby="cn-install-choose">
        <h2 id="cn-install-choose">Chọn thiết bị của bạn</h2>
        <p className="cn-section-description">Mỗi trình duyệt đặt nút cài ở một chỗ khác nhau.</p>
        <div className="cn-install-tabs" role="tablist" aria-label="Thiết bị">
          {INSTALL_PLATFORMS.map((item, index) => (
            <button
              key={item.id}
              id={`cn-install-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={item.id === active}
              aria-controls="cn-install-panel"
              tabIndex={item.id === active ? 0 : -1}
              className={`cn-install-tab${item.id === active ? ' is-active' : ''}`}
              onClick={() => setActive(item.id)}
              onKeyDown={(event) => onTabKey(event, index)}
            >
              <Icon name={item.icon} />
              <span><strong>{item.label}</strong><small>{item.browser}</small></span>
            </button>
          ))}
        </div>
        <div id="cn-install-panel" className="cn-install-panel" role="tabpanel" aria-labelledby={`cn-install-tab-${platform.id}`}>
          <h3><Icon name={platform.icon} />Cài trên {platform.label} ({platform.browser})</h3>
          <ol className="cn-steps">
            {platform.steps.map((step, index) => (
              <li key={step.title}>
                <span className="cn-step-number">{index + 1}</span>
                <span><strong>{step.title}</strong><small>{index === 0 && platform.id !== 'other' ? `${step.detail} Địa chỉ: ${address}` : step.detail}</small></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cn-container cn-page-section">
        <div className="cn-page-callout">
          <Icon name="question-circle" />
          <div>
            <h2>Chưa thấy tùy chọn cài đặt?</h2>
            <ul>{INSTALL_TROUBLESHOOTING.map((tip) => <li key={tip}>{tip}</li>)}</ul>
            <p>Vẫn chưa được? Xem <Link to="/ho-tro">trang hỗ trợ</Link> hoặc gửi thư cho chúng tôi.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
