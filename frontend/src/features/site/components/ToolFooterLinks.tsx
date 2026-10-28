import { SiteContact } from './SiteContact'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

// Tool pages skip the full site footer (it would sit under the workspace), but spec v3 §10 still wants a
// feedback point on every tool that never covers the main action. Slugs are fixed site pages, not menu config.
const LINKS = [
  { id: 'feedback', to: '/gop-y-quy-dinh' },
  { id: 'suggest', to: '/de-xuat-tien-ich' },
  { id: 'terms', to: '/dieu-khoan' },
] as const

export function ToolFooterLinks() {
  const { t } = useTranslation('site')
  return (
    <footer className="cn-tool-footer">
      <nav aria-label={t('footer.navLabel')}>
        {LINKS.map((item) => <Link key={item.to} to={item.to}>{t(`footer.links.${item.id}`)}</Link>)}
      </nav>
      <SiteContact />
    </footer>
  )
}
