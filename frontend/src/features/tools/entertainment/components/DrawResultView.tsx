import { useTranslation } from 'react-i18next'
import type { useDraw } from '../hooks/useDraw'
import type { CardIdentity } from '../types/entertainment.types'
import { getCardArtwork } from '../services/card-artwork'
import { drawReading } from '../services/card-reading'
import { drawReadingLines } from '../services/reading-report'
import { CardFace } from './CardFace'
import { CardInterpretations } from './CardInterpretations'
import { ReadingOverview } from './ReadingOverview'
import { ReadingSources } from './ReadingSources'
import { ReportActions } from './ReportActions'
import { ResultProvenance } from './ResultProvenance'
import { SpreadGuide } from './SpreadGuide'

export function DrawResultView({ draw }: { draw: ReturnType<typeof useDraw> }) {
  const { t } = useTranslation('entertainment')
  if (!draw.result) return null
  const result = draw.result.result
  const kind = result.kind
  const complete = result.cards.every(card => draw.revealed.includes(card.id))
  const labelOf = (card: CardIdentity) => {
    const artwork = getCardArtwork(card.id)
    const fallback = card.name ?? ([card.rank, card.suit].filter(Boolean).join(' ') || card.id)
    return artwork ? t(artwork.labelKey) : fallback.replaceAll('_', ' ')
  }
  const reading = drawReading(result, labelOf)
  const title = t(kind === 'cards' ? 'cards.title' : 'tarot.title')
  const lines = [...drawReadingLines(reading, kind, labelOf), `${t('source.version')}: ${draw.result.rule_version}`, `${t('source.sources')}: ${draw.result.source_ids.join(', ')}`, `${t('source.request')}: ${draw.result.request_id}`]
  return <section className="cn-ent-reading" aria-labelledby={`${kind}-result`}>
    <h2 id={`${kind}-result`}>{t('cards.result')}</h2>
    <p role="status">{t(draw.expired ? 'cards.expired' : complete ? 'cards.complete' : 'cards.revealHint')}</p>
    <SpreadGuide amount={result.cards.length} />
    <ul className="cn-ent-deck" data-count={result.cards.length}>{result.cards.map(card => <CardFace key={card.id} kind={kind} card={card} revealed={draw.revealed.includes(card.id)} expired={draw.expired} onReveal={() => draw.reveal(card.id)} />)}</ul>
    <p className="cn-ent-zoom-hint">{t('artwork.hint')}</p>
    <div className="cn-ent-actions">
      <button className="cn-button" disabled={complete || draw.expired} onClick={draw.revealAll}>{t('cards.revealAll')}</button>
      <button className="cn-button cn-button--ghost" onClick={draw.reset}>{t('actions.restart')}</button>
    </div>
    {complete ? <ReadingOverview summary={reading.summary} /> : <p className="cn-ent-reading-note">{t('reading.overviewAfterReveal')}</p>}
    <CardInterpretations reading={reading} revealed={draw.revealed} labelOf={labelOf} />
    <ReadingSources kind={kind} />
    <ResultProvenance result={draw.result} />
    <ReportActions title={title} lines={lines} disabled={!complete || draw.expired} drawKey={draw.drawKey} />
  </section>
}
