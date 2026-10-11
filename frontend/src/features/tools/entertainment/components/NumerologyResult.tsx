import { useTranslation } from 'react-i18next'
import type { NumerologyResult as Calculation, EntertainmentEnvelope } from '../types/entertainment.types'
import { ResultProvenance } from './ResultProvenance'
import { ReportActions } from './ReportActions'

export function NumerologyResult({ result, onReset }: { result: EntertainmentEnvelope<Calculation>; onReset: () => void }) {
  const { t } = useTranslation('entertainment')
  const nameOf = (id: string) => t(`numerology.metrics.${id}` as 'numerology.metrics.life_path')
  const rows = [t('numerology.title'), t('numerology.method'), ...(result.result.normalized_name ? [`${t('numerology.normalized')}: ${result.result.normalized_name}`] : []), `${t('numerology.year')}: ${result.result.personal_year}`,
    ...result.result.metrics.map(metric => `${nameOf(metric.id)}: ${metric.value ?? t('numerology.noVowels')} (${metric.steps.join(' → ')})`), `${t('source.version')}: ${result.rule_version}`, `${t('source.sources')}: ${result.source_ids.join(', ')}`, t('source.pending')]
  return <section className="cn-ent-result"><h2>{t('numerology.result')}</h2><p>{t('numerology.method')}</p>{result.result.normalized_name ? <p>{t('numerology.normalized')}: <strong>{result.result.normalized_name}</strong></p> : null}<p>{t('numerology.year')}: {result.result.personal_year}</p><dl className="cn-ent-metrics">{result.result.metrics.map(metric => <div key={metric.id}><dt>{nameOf(metric.id)}</dt><dd><strong>{metric.value ?? '—'}</strong><small>{metric.value === null ? t('numerology.noVowels') : `${t('numerology.steps')}: ${metric.steps.join(' → ')}`}</small></dd></div>)}</dl><p>{t('numerology.noMeaning')}</p><ResultProvenance result={result} /><ReportActions title={t('numerology.title')} lines={rows} /><button className="cn-button cn-button--ghost" onClick={onReset}>{t('actions.restart')}</button></section>
}
