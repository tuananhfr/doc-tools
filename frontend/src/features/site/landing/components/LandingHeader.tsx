import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { SiteBrand } from '@/features/site/components/SiteBrand'
import { LANDING_NAVIGATION } from '../config/landing-content'
import { LandingPreferences } from './LandingPreferences'
import { LandingNavigation } from './LandingNavigation'

export function LandingHeader() {
  const { t } = useTranslation('site')
  const [open, setOpen] = useState(false)
  return (
    <header className="cn-landing-header">
      <a href="#cn-main" className="cn-skip-link">{t('header.skipLink')}</a>
      <div className="cn-landing-container cn-landing-header-inner">
        <SiteBrand />
        <nav className="cn-landing-nav" aria-label={t('header.mainNav')}>
          {LANDING_NAVIGATION.map(item => <Link key={item.key} to={item.hash}>{t(`landing.nav.${item.key}`)}</Link>)}
        </nav>
        <div className="cn-landing-header-actions">
          <LandingPreferences />
          <Link className="cn-landing-button cn-landing-button--outline cn-landing-open" to="/cong-cu">{t('landing.openTools')}</Link>
          <button className="cn-landing-menu-toggle" type="button" aria-label={t('header.openMenu')} aria-expanded={open} aria-controls="cn-landing-menu" onClick={() => setOpen(true)}><Icon name="list" /></button>
        </div>
      </div>
      {/* Unmount on close so interrupted transitions cannot retain the focus trap. */}
      {open ? <LandingNavigation open onClose={() => setOpen(false)} /> : null}
    </header>
  )
}
