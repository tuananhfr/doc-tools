import type { AiTask } from '@/features/embed/embed-protocol'
import type { RuleSnapshot } from '../types/ai.types'

const TASK_BY_DOMAIN: Record<string, AiTask> = {
  electricity: 'check_electricity',
  payroll: 'check_payroll',
  addresses: 'check_address',
}

export function hostCheckTask(domain: string): AiTask | null {
  return Object.hasOwn(TASK_BY_DOMAIN, domain) ? TASK_BY_DOMAIN[domain] : null
}

type MessageKey = `host.check.${'body' | 'source' | 'noSource'}`
type Translate = (key: MessageKey, values?: Record<string, string>) => string

/** The host's agent cannot open our signed rule packages, so the source travels with the result. */
export function hostSourceCheckText(result: string, snapshot: RuleSnapshot | null, t: Translate, max: number): string {
  const source = snapshot
    ? t('host.check.source', { title: snapshot.sourceTitle, from: snapshot.effectiveFrom, url: snapshot.sourceUrl })
    : t('host.check.noSource')
  return t('host.check.body', { result: result.trim(), source }).slice(0, max)
}
