import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { HUB_NAVIGATION } from '../config/site-navigation'

/** Đường vào mọi trang nhóm; tên nhóm lấy chung khoá `hubs.<slug>.label` với breadcrumb của trang nhóm. */
export function HubGroupLinks({ onNavigate, showTitle = false }: { onNavigate?: () => void; showTitle?: boolean }) {
  const { t } = useTranslation('site')
  return (
    <nav className="cn-hub-links" aria-label={t('nav.groups')}>
      {showTitle ? <p className="cn-hub-links__title" aria-hidden="true">{t('nav.groups')}</p> : null}
      {HUB_NAVIGATION.map((slug) => <Link key={slug} to={'/' + slug} onClick={onNavigate}>{t(`hubs.${slug}.label`)}</Link>)}
    </nav>
  )
}
