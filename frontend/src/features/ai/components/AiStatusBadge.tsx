import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import type { ProviderStatus } from '../types/ai.types'

const TONE = {
  none: { tone: '', icon: 'dash-circle' },
  verifying: { tone: 'is-warn', icon: 'hourglass-split' },
  ready: { tone: 'is-good', icon: 'check-circle-fill' },
  failed: { tone: 'is-bad', icon: 'exclamation-circle-fill' },
  disabled: { tone: 'is-bad', icon: 'slash-circle' },
} as const satisfies Record<ProviderStatus | 'none', { tone: string; icon: string }>

export function AiStatusBadge({ status }: { status: ProviderStatus | 'none' }) {
  const { t } = useTranslation('ai')
  const { tone, icon } = TONE[status]
  return <span className={`cn-status${tone ? ` ${tone}` : ''}`}><Icon name={icon} />{t(`status.${status}`)}</span>
}
