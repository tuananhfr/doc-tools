import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import { AI_TEXT_MAX, HostAiAnswer, useHostAi } from '@/features/embed'
import type { RuleSnapshot } from '../types/ai.types'
import { hostCheckTask, hostSourceCheckText } from '../utils/host-source-check'

interface HostSourceCheckProps {
  domain: string
  snapshot: RuleSnapshot | null
  currentResult: string
}

/** Embedded in ERPCons: one-shot check of the current result by the host's AI; no drafts, no chat. */
export function HostSourceCheck({ domain, snapshot, currentResult }: HostSourceCheckProps) {
  const { t } = useTranslation('ai')
  const { state, run } = useHostAi()
  const task = hostCheckTask(domain)
  if (!task || currentResult.trim() === '') return null

  const check = () => run({ task, text: hostSourceCheckText(currentResult, snapshot, (key, values) => t(key, values), AI_TEXT_MAX) })

  return (
    <section className="cn-ai cn-ai-check is-ready" aria-labelledby="cn-host-check-title">
      <header className="cn-ai-check__head">
        <span className="cn-ai-invite__icon"><Icon name="shield-check" /></span>
        <div>
          <h2 id="cn-host-check-title">{t('host.check.title')}</h2>
          <p>{t('host.check.text')}</p>
        </div>
      </header>
      <div>
        <button type="button" className="cn-button" disabled={state.status === 'running'} onClick={check}>
          <Icon name="search" />{t('host.check.run')}
        </button>
      </div>
      <HostAiAnswer state={state} onRetry={check} />
    </section>
  )
}
