import { NUMEROLOGY_MEANINGS, type NumerologyMetricId } from '../data/numerology-meanings'
import type { Metric, NumerologyResult } from '../types/entertainment.types'
import { numerologyConclusion } from './numerology-conclusion'
import { NUMEROLOGY_METRIC_ROLES } from '../config/numerology-method'

export function numerologyMeaning(metric: Metric) {
  if (metric.value === null || !Number.isInteger(metric.value) || !Object.hasOwn(NUMEROLOGY_MEANINGS, metric.id)) return null
  const meanings = NUMEROLOGY_MEANINGS[metric.id as NumerologyMetricId]
  return Object.hasOwn(meanings, metric.value) ? meanings[metric.value] : null
}

export function numerologyReading(result: NumerologyResult) {
  const metrics = result.metrics.map(metric => ({ metric, meaning: numerologyMeaning(metric), role: Object.hasOwn(NUMEROLOGY_METRIC_ROLES, metric.id) ? NUMEROLOGY_METRIC_ROLES[metric.id] : undefined }))
  const summary = numerologyConclusion(metrics, result.personal_year)
  return { metrics, summary }
}
