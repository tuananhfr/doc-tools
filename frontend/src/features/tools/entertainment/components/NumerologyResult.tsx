import { useTranslation } from 'react-i18next'
import type { NumerologyResult as Calculation, EntertainmentEnvelope } from '../types/entertainment.types'
import { ResultProvenance } from './ResultProvenance'
import { ReportActions } from './ReportActions'
import { numerologyReading } from '../services/numerology-reading'
import { numerologyReadingLines } from '../services/reading-report'
import { NumerologyInterpretations } from './NumerologyInterpretations'
import { ReadingOverview } from './ReadingOverview'
import { ReadingSources } from './ReadingSources'

export function NumerologyResult({ result, onReset }: { result: EntertainmentEnvelope<Calculation>; onReset: () => void }) {
  const { t } = useTranslation('entertainment')
  const nameOf = (id: string) => t(`numerology.metrics.${id}` as 'numerology.metrics.life_path')
  const reading = numerologyReading(result.result)
  const rows = [t('numerology.method'), ...(result.result.normalized_name ? [`${t('numerology.normalized')}: ${result.result.normalized_name}`] : []), `${t('numerology.year')}: ${result.result.personal_year}`,
    ...numerologyReadingLines(reading, nameOf), `${t('source.version')}: ${result.rule_version}`, `${t('source.sources')}: ${result.source_ids.join(', ')}`, `${t('source.request')}: ${result.request_id}`]
  return <section className="cn-ent-result">
    <h2>{t('numerology.result')}</h2><p>{t('numerology.method')}</p>
    {result.result.normalized_name ? <p>{t('numerology.normalized')}: <strong>{result.result.normalized_name}</strong></p> : null}
    <p>{t('numerology.year')}: {result.result.personal_year}</p>
    <dl className="cn-ent-metrics">{result.result.metrics.map(metric => <div key={metric.id}>
      <dt>{nameOf(metric.id)}</dt>
      <dd><strong>{metric.value ?? t('reading.notCalculated')}</strong><small>{metric.value === null ? t('numerology.noVowels') : `${t('numerology.steps')}: ${metric.steps.join(' → ')}`}</small></dd>
    </div>)}</dl>
    <ReadingOverview summary={reading.summary} />
    <NumerologyInterpretations reading={reading} nameOf={nameOf} />
    <ReadingSources kind="numerology" />
    <ResultProvenance result={result} />
    <ReportActions title={t('numerology.title')} lines={rows} />
    <button className="cn-button cn-button--ghost" onClick={onReset}>{t('actions.restart')}</button>
  </section>
}
