import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

// Tool pages skip the full site footer (it would sit under the workspace), but spec v3 §10 still wants a
// feedback point on every tool that never covers the main action. Slugs are fixed site pages, not menu config.
const LINKS = [
  { id: 'feedback', to: '/gop-y-quy-dinh' },
  { id: 'suggest', to: '/de-xuat-tien-ich' },
] as const

export function ToolFooterLinks() {
  const { t } = useTranslation('site')
  return (
    <nav className="cn-tool-footer" aria-label={t('footer.navLabel')}>
      {LINKS.map((item) => <Link key={item.to} to={item.to}>{t(`footer.links.${item.id}`)}</Link>)}
    </nav>
  )
}
