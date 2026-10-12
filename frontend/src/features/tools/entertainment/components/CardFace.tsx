import { useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardIdentity, DeckKind } from '../types/entertainment.types'
import { getCardArtwork } from '../services/card-artwork'
import { CardArtwork } from './CardArtwork'
import { CardImageDialog } from './CardImageDialog'

// Keep in sync with the .cn-ent-card-inner transition duration in entertainment.css.
const FLIP_MS = 560

export function CardFace({ card, kind, positionTitle, revealed, flipDelay = 0, onReveal }: { card: CardIdentity; kind: DeckKind; positionTitle?: string; revealed: boolean; flipDelay?: number; onReveal: () => void }) {
  const { t } = useTranslation('entertainment')
  const [showImage, setShowImage] = useState(false)
  const [settled, setSettled] = useState(revealed)
  const flipping = revealed && !settled
  const asset = getCardArtwork(card.id)
  const artwork = asset?.kind === kind ? asset : undefined
  const label = artwork ? t(artwork.labelKey) : (card.name ?? card.id).replaceAll('_', ' ')
  useEffect(() => {
    if (!revealed) { setSettled(false); return }
    // A timer rather than transitionend: the event never fires while the tab is hidden, which would lock the zoom dialog.
    const instant = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const timer = setTimeout(() => setSettled(true), instant ? 0 : FLIP_MS + flipDelay)
    return () => clearTimeout(timer)
  }, [revealed, flipDelay])
  return <li className="cn-ent-card-slot">
    <span lang={positionTitle ? 'vi' : undefined}>{positionTitle ?? t('cards.position', { number: card.position })}</span>
    <button type="button" className={'cn-ent-card cn-ent-card--' + kind + (revealed ? ' is-revealed' : '')} style={{ '--cn-ent-flip-delay': `${flipDelay}ms` } as CSSProperties} aria-label={revealed ? t('artwork.zoom', { name: label }) : t('cards.reveal', { number: card.position })} onClick={() => revealed ? !flipping && setShowImage(true) : onReveal()} disabled={revealed && !artwork}>
      <span className="cn-ent-card-inner">
        <span className="cn-ent-card-face cn-ent-card-back" aria-hidden={revealed}>
          <CardArtwork path={'/assets/entertainment/' + kind + '/back.svg'} label={t('cards.reveal', { number: card.position })} />
        </span>
        {/* The face is only mounted once revealed so an unflipped card never carries its identity in the DOM. */}
        <span className="cn-ent-card-face cn-ent-card-front" aria-hidden={!revealed}>
          {!revealed ? null : artwork ? <CardArtwork path={artwork.path} label={label} reversed={kind === 'tarot' && card.orientation === 'REVERSED'} /> : <span className="cn-ent-card-fallback"><strong>{label}</strong><small>{t('artwork.unavailable')}</small></span>}
        </span>
      </span>
    </button>
    {/* The name waits for the flip to land, otherwise the caption gives the card away before the face turns. */}
    <span className="cn-ent-card-caption">{flipping ? null : revealed ? <><strong>{label}</strong>{kind === 'tarot' ? <small>{t(card.orientation === 'REVERSED' ? 'cards.reversed' : 'cards.upright')}</small> : null}</> : t('cards.tap')}</span>
    {artwork ? <CardImageDialog show={showImage} path={artwork.path} label={label} orientation={kind === 'tarot' ? card.orientation : undefined} onClose={() => setShowImage(false)} /> : null}
  </li>
}
