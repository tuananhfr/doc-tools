import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { CONTRIBUTION_STATUS_LOOK } from '../config/contribution-status'
import type { ContributionStatus } from '../types/account.types'

export function ContributionStatusBadge({ status }: { status: ContributionStatus }) {
  const { t } = useTranslation('community')
  const look = CONTRIBUTION_STATUS_LOOK[status]
  return <span className={`cn-status is-${look.tone}`}><Icon name={look.icon} />{t(`contribution.status.${status}`)}</span>
}
