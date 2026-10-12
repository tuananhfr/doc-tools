import { NUMEROLOGY_MEANINGS, type NumerologyMetricId } from '../data/numerology-meanings'
import type { Metric, NumerologyResult } from '../types/entertainment.types'
import { firstSentence, type ReadingSummary } from './reading-summary'
import { NUMEROLOGY_METRIC_ROLES } from '../config/numerology-method'

export function numerologyMeaning(metric: Metric) {
  if (metric.value === null || !Number.isInteger(metric.value) || !Object.hasOwn(NUMEROLOGY_MEANINGS, metric.id)) return null
  const meanings = NUMEROLOGY_MEANINGS[metric.id as NumerologyMetricId]
  return Object.hasOwn(meanings, metric.value) ? meanings[metric.value] : null
}

export function numerologyReading(result: NumerologyResult) {
  const metrics = result.metrics.map(metric => ({ metric, meaning: numerologyMeaning(metric), role: Object.hasOwn(NUMEROLOGY_METRIC_ROLES, metric.id) ? NUMEROLOGY_METRIC_ROLES[metric.id] : undefined }))
  const known = metrics.filter(item => item.metric.value !== null)
  const summary: ReadingSummary | null = known.length && known.every(item => item.meaning)
    ? { items: known.map(({ metric, meaning, role }) => ({ label: `${role?.name ?? metric.id}${metric.id === 'personal_year' ? ` ${result.personal_year}` : ''}: ${metric.value}`, role: '', text: firstSentence(meaning!.text) })) }
    : null
  return { metrics, summary }
}
