import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'

export interface BreadcrumbItem {
  label: string
  /** Bỏ trống ở mục cuối: trang đang đứng. */
  to?: string
}

export function Breadcrumb({ items }: { items: readonly BreadcrumbItem[] }) {
  const { t } = useTranslation('site')
  return (
    <nav className="cn-breadcrumb" aria-label={t('breadcrumb.label')}>
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {index > 0 ? <Icon name="chevron-right" /> : null}
            {item.to ? <Link to={item.to}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}
