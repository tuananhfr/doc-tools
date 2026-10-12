import { useTranslation } from 'react-i18next'
import type { numerologyReading } from '../services/numerology-reading'

export function NumerologyInterpretations({ reading, nameOf }: { reading: ReturnType<typeof numerologyReading>; nameOf: (id: string) => string }) {
  const { t, i18n } = useTranslation('entertainment')
  return <section className="cn-ent-interpretations" aria-labelledby="ent-number-meanings">
    <h3 id="ent-number-meanings">{t('reading.numberTitle')}</h3>
    {i18n.language !== 'vi' ? <p className="cn-ent-reading-note">{t('reading.language')}</p> : null}
    {reading.metrics.map(({ metric, meaning, role }, index) => <details key={metric.id} className="cn-ent-meaning" open={index === 0}>
      <summary>{nameOf(metric.id)}: {metric.value ?? t('reading.notCalculated')}</summary>
      <div className="cn-ent-meaning-body" lang="vi" dir="ltr">
        {role ? <p className="cn-ent-reading-note">{role.description}</p> : null}
        {meaning ? <><p className="cn-ent-keywords">{meaning.keywords.join(' · ')}</p><p>{meaning.text}</p><dl className="cn-ent-meaning-facts"><div><dt>{metric.id === 'personal_year' ? 'Nên tập trung' : 'Điểm mạnh'}</dt><dd>{meaning.strength}</dd></div><div><dt>{metric.id === 'personal_year' ? 'Cần tránh' : 'Điểm dễ vướng'}</dt><dd>{meaning.growth}</dd></div></dl><p><strong>Lời khuyên: </strong>{meaning.advice}</p></> : <p>{t(metric.value === null ? 'numerology.noVowels' : 'reading.unavailable')}</p>}
      </div>
    </details>)}
  </section>
}
