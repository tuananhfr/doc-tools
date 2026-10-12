import { useTranslation } from 'react-i18next'
import type { ReadingSummary } from '../services/reading-summary'

export function ReadingOverview({ summary, subject = 'cards' }: { summary: ReadingSummary | null; subject?: 'cards' | 'numbers' }) {
  const { t } = useTranslation('entertainment')
  if (!summary) return null
  const { conclusion } = summary
  return <section className="cn-ent-overview" aria-labelledby="ent-reading-overview">
    <h3 id="ent-reading-overview">{t('reading.conclusion')}</h3>
    <div lang="vi" dir="ltr">
      <div className="cn-ent-conclusion-copy">
        {conclusion.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        {conclusion.advice ? <p><strong>Lời khuyên: </strong>{conclusion.advice}</p> : null}
      </div>
      {conclusion.period ? <section className="cn-ent-conclusion-period">
        <h4>{conclusion.period.title}</h4>
        <p>{conclusion.period.text}</p>
        <p><strong>Nên làm trong năm này: </strong>{conclusion.period.advice}</p>
      </section> : null}
      {summary.items.length ? <details className="cn-ent-conclusion-reasons">
        <summary>{t('reading.reasoning')}</summary>
        <ul>{summary.items.map((item, index) => <li key={index}><strong>{item.role ? `${item.role} · ` : ''}{item.label}:</strong> {item.text}</li>)}</ul>
      </details> : null}
    </div>
    <p className="cn-ent-reading-note">{t(subject === 'numbers' ? 'reading.numberSummaryNote' : 'reading.summaryNote')}</p>
  </section>
}
