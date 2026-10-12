import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { withBase } from '@/utils/url'
import { DRAW_SPREADS } from '../config/draw-spreads'
import type { useDraw } from '../hooks/useDraw'
import type { CardIdentity } from '../types/entertainment.types'
import { getCardArtwork } from '../services/card-artwork'
import { drawReading } from '../services/card-reading'
import { drawReadingLines, reportTimeLine } from '../services/reading-report'
import { CardFace } from './CardFace'
import { CardInterpretations } from './CardInterpretations'
import { ReadingOverview } from './ReadingOverview'
import { ReadingSources } from './ReadingSources'
import { ReportActions } from './ReportActions'
import { ResultProvenance } from './ResultProvenance'
import { SpreadGuide } from './SpreadGuide'

const REVEAL_ALL_STAGGER_MS = 120

export function DrawResultView({ draw }: { draw: ReturnType<typeof useDraw> }) {
  const { t } = useTranslation('entertainment')
  const [flipDelays, setFlipDelays] = useState<Record<string, number>>({})
  const drawn = draw.result?.result
  useEffect(() => {
    // Warm the cache so the face is decoded before the flip reaches its midpoint; the draw response already names every card.
    drawn?.cards.forEach(card => {
      const artwork = getCardArtwork(card.id)
      if (artwork?.kind === drawn.kind) new Image().src = withBase(artwork.path)
    })
  }, [drawn])
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
  const lines = [...(draw.drawnAt ? [reportTimeLine(t('report.drawnAt'), draw.drawnAt)] : []), ...drawReadingLines(reading, kind, labelOf)]
  const positions = DRAW_SPREADS[result.cards.length]?.positions
  const revealAll = () => {
    const pending = result.cards.filter(card => !draw.revealed.includes(card.id))
    setFlipDelays(Object.fromEntries(pending.map((card, index) => [card.id, index * REVEAL_ALL_STAGGER_MS])))
    draw.revealAll()
  }
  const reset = () => { setFlipDelays({}); draw.reset() }
  return <section className="cn-ent-reading" aria-labelledby={`${kind}-result`}>
    <h2 id={`${kind}-result`}>{t('cards.result')}</h2>
    <p role="status">{t(complete ? 'cards.complete' : 'cards.revealHint')}</p>
    {draw.expired ? <p className="cn-ent-reading-note">{t('cards.expired')}</p> : null}
    <SpreadGuide amount={result.cards.length} />
    <ul className="cn-ent-deck" data-count={result.cards.length}>{result.cards.map(card => <CardFace key={card.id} kind={kind} card={card} positionTitle={positions?.[card.position - 1]?.title} revealed={draw.revealed.includes(card.id)} flipDelay={flipDelays[card.id] ?? 0} onReveal={() => draw.reveal(card.id)} />)}</ul>
    <p className="cn-ent-zoom-hint">{t('artwork.hint')}</p>
    <div className="cn-ent-actions">
      <button className="cn-button" disabled={complete} onClick={revealAll}>{t('cards.revealAll')}</button>
      <button className="cn-button cn-button--ghost" onClick={reset}>{t('actions.restart')}</button>
    </div>
    {complete ? <ReadingOverview summary={reading.summary} /> : <p className="cn-ent-reading-note">{t('reading.overviewAfterReveal')}</p>}
    <CardInterpretations reading={reading} revealed={draw.revealed} labelOf={labelOf} />
    <ReadingSources kind={kind} />
    <ResultProvenance result={draw.result} />
    <ReportActions title={title} lines={lines} disabled={!complete} drawKey={draw.expired ? undefined : draw.drawKey} />
  </section>
}
