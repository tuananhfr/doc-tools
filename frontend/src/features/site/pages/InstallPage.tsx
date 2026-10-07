import { useEffect, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { appConfig } from '@/config/app.config'
import { usePageTitle } from '@/features/tools/hub/hooks/usePageTitle'
import { withBase } from '@/utils/url'
import { SitePageHero } from '../components/SitePageHero'
import { detectInstallPlatform, INSTALL_PLATFORMS, INSTALL_TROUBLESHOOTING, type InstallPlatformId } from '../config/install-guide'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

const BENEFITS = [
  { id: 'fast', icon: 'lightning-charge' },
  { id: 'fullscreen', icon: 'arrows-fullscreen' },
  { id: 'noStore', icon: 'shop' },
  { id: 'free', icon: 'gift' },
] as const

interface InstallPlatformText {
  label: string
  browser: string
  steps: Record<string, { title: string; detail: string }>
}

export default function InstallPage() {
  const { t } = useTranslation('site')
  usePageTitle(t('pages.cai-dat.title'))
  const [active, setActive] = useState<InstallPlatformId>('android')
  const [address, setAddress] = useState(() => appConfig.siteUrl.replace(/^https?:\/\//, '') + withBase('/'))
  const { state: installState, install } = useInstallPrompt()

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
  const platformText = (id: InstallPlatformId): InstallPlatformText => t(`install.platforms.${id}`, { returnObjects: true })
  const activeText = platformText(platform.id)

  return (
    <div className="cn-site-page cn-install">
      <SitePageHero
        id="cn-install-title"
        trail={[{ label: t('breadcrumb.home'), to: '/' }, { label: t('install.trail') }]}
        title={<Trans ns="site" i18nKey="install.title" components={{ accent: <span /> }} />}
        tagline={t('install.tagline')}
        description={<p>{t('install.intro')}</p>}
        caption={t('install.caption')}
        art={<span className="cn-install-phone"><Image src={withBase('/icons/icon-192.png')} width={96} height={96} alt="" /><b>Chuyện Nhỏ</b></span>}
      >
        <ul className="cn-page-points">{BENEFITS.map((item) => <li key={item.id}><Icon name={item.icon} />{t(`install.benefits.${item.id}`)}</li>)}</ul>
        {installState === 'ready' ? (
          <div className="cn-install-action">
            <button type="button" className="cn-button cn-install-cta" onClick={() => void install()}>
              <Icon name="download" />{t('install.cta')}
            </button>
            <span>{t('install.ctaHint')}</span>
          </div>
        ) : null}
        {installState === 'installed' ? (
          <p className="cn-install-done" role="status"><Icon name="check-circle-fill" />{t('install.installed')}</p>
        ) : null}
      </SitePageHero>

      <section className="cn-container cn-page-section" aria-labelledby="cn-install-choose">
        <h2 id="cn-install-choose">{t('install.chooseTitle')}</h2>
        <p className="cn-section-description">{t('install.chooseDescription')}</p>
        <div className="cn-install-tabs" role="tablist" aria-label={t('install.tabsLabel')}>
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
              <span><strong>{platformText(item.id).label}</strong><small>{platformText(item.id).browser}</small></span>
            </button>
          ))}
        </div>
        <div id="cn-install-panel" className="cn-install-panel" role="tabpanel" aria-labelledby={`cn-install-tab-${platform.id}`}>
          <h3><Icon name={platform.icon} />{t('install.panelTitle', { platform: activeText.label, browser: activeText.browser })}</h3>
          <ol className="cn-steps">
            {platform.steps.map((step, index) => (
              <li key={step}>
                <span className="cn-step-number">{index + 1}</span>
                <span><strong>{activeText.steps[step].title}</strong><small>{index === 0 && platform.id !== 'other' ? t('install.stepWithAddress', { detail: activeText.steps[step].detail, address }) : activeText.steps[step].detail}</small></span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="cn-container cn-page-section">
        <div className="cn-page-callout">
          <Icon name="question-circle" />
          <div>
            <h2>{t('install.troubleshootTitle')}</h2>
            <ul>{INSTALL_TROUBLESHOOTING.map((tip) => <li key={tip}>{t(`install.troubleshooting.${tip}`)}</li>)}</ul>
            <p><Trans ns="site" i18nKey="install.stillStuck" components={{ link: <Link to="/ho-tro" /> }} /></p>
          </div>
        </div>
      </section>
    </div>
  )
}
