import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'

export function AdminGateCard({ icon, title, text, action }: { icon: string; title: string; text: string; action: ReactNode }) {
  return (
    <div className="cn-site cn-admin is-gate">
      <div className="cn-admin-gate">
        <span className="cn-admin-gate__icon"><Icon name={icon} /></span>
        <h1>{title}</h1>
        <p>{text}</p>
        <div className="cn-admin-gate__actions">
          {action}
          <Link className="cn-admin-button is-ghost" to="/">Về trang chủ</Link>
        </div>
      </div>
    </div>
  )
}
