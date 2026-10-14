'use client'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { StateView } from '@/components/ui/StateView'
import type { HostAiState } from './useHostAi'

export function HostAiAnswer({ state, onRetry }: { state: HostAiState; onRetry(): void }) {
  const { t } = useTranslation('ai')
  if (state.status === 'running') {
    return <p className="cn-host-ai__status" role="status"><Icon name="hourglass-split" />{t('host.thinking')}</p>
  }
  if (state.status === 'error') {
    return (
      <StateView
        icon="exclamation-triangle"
        tone="danger"
        title={t(`host.errors.${state.code}`)}
        actions={<button type="button" className="cn-button cn-button--ghost" onClick={onRetry}>{t('host.retry')}</button>}
      />
    )
  }
  if (state.status === 'done') {
    return (
      <section className="cn-host-ai__answer" aria-live="polite">
        <h3>{t('host.answerTitle')}</h3>
        <p>{state.text}</p>
      </section>
    )
  }
  return null
}
