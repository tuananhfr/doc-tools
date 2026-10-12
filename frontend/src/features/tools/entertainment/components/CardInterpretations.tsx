import { useTranslation } from 'react-i18next'
import type { CardIdentity } from '../types/entertainment.types'
import type { drawReading } from '../services/card-reading'

export function CardInterpretations({ reading, revealed, labelOf }: {
  reading: ReturnType<typeof drawReading>
  revealed: readonly string[]
  labelOf: (card: CardIdentity) => string
}) {
  const { t, i18n } = useTranslation('entertainment')
  const visible = reading.cards.filter(item => revealed.includes(item.card.id))
  return <section className="cn-ent-interpretations" aria-labelledby="ent-card-meanings">
    <h3 id="ent-card-meanings">{t('reading.cardTitle')}</h3>
    {i18n.language !== 'vi' ? <p className="cn-ent-reading-note">{t('reading.language')}</p> : null}
    {!visible.length ? <p>{t('reading.revealFirst')}</p> : visible.map(({ card, position, meaning }, index) => <details className="cn-ent-meaning" key={card.id} open={index === 0}>
      <summary><span>{card.position}. {labelOf(card)}{card.orientation === 'REVERSED' ? ` · ${t('cards.reversed')}` : ''}</span><span className="cn-ent-meaning-role" lang="vi">{position?.title}</span></summary>
      <div className="cn-ent-meaning-body" lang="vi" dir="ltr">
        {position ? <p className="cn-ent-reading-note">{position.description}</p> : null}
        {meaning ? <><p className="cn-ent-keywords">{meaning.keywords.join(' · ')}</p><p>{meaning.text}</p><p><strong>Lời khuyên: </strong>{meaning.advice}</p></> : <p>{t('reading.unavailable')}</p>}
      </div>
    </details>)}
  </section>
}
