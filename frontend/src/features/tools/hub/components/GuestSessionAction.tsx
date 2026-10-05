import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import type { GuestSessionAction as Action } from '../hooks/useGuestSessionAction'

interface GuestSessionActionProps {
  action: Action
  className?: string
}

/** `erp-tools-guest__login` là chỗ bám của `scripts/doc-tools/check-tool-routes.mjs`. */
export function GuestSessionAction({ action, className = '' }: GuestSessionActionProps) {
  return (
    <Link className={`btn btn-sm erp-tools-guest__login ${className}`.trim()} to={action.to}>
      {action.label}
      {action.openInApp ? <Icon name="arrow-right" className="ms-2" /> : null}
    </Link>
  )
}
