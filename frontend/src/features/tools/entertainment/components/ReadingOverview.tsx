import { useTranslation } from 'react-i18next'
import type { ReadingSummary } from '../services/reading-summary'

export function ReadingOverview({ summary }: { summary: ReadingSummary | null }) {
  const { t } = useTranslation('entertainment')
  if (!summary) return null
  return <section className="cn-ent-overview" aria-labelledby="ent-reading-overview">
    <h3 id="ent-reading-overview">{t('reading.overview')}</h3>
    <div lang="vi" dir="ltr">
      <ul>{summary.items.map((item, index) => <li key={index}><strong>{item.role ? `${item.role} · ` : ''}{item.label}:</strong> {item.text}</li>)}</ul>
      {summary.advice ? <p><strong>Lời khuyên từ {summary.advice.label}: </strong>{summary.advice.text}</p> : null}
    </div>
    <p className="cn-ent-reading-note">{t('reading.summaryNote')}</p>
  </section>
}
