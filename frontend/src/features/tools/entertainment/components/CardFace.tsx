import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardIdentity, DeckKind } from '../types/entertainment.types'
import { getCardArtwork } from '../services/card-artwork'
import { CardArtwork } from './CardArtwork'
import { CardImageDialog } from './CardImageDialog'

export function CardFace({ card, kind, revealed, expired = false, onReveal }: { card: CardIdentity; kind: DeckKind; revealed: boolean; expired?: boolean; onReveal: () => void }) {
  const { t } = useTranslation('entertainment')
  const [showImage, setShowImage] = useState(false)
  const asset = getCardArtwork(card.id)
  const artwork = asset?.kind === kind ? asset : undefined
  const label = artwork ? t(artwork.labelKey) : (card.name ?? card.id).replaceAll('_', ' ')
  const path = revealed && artwork ? artwork.path : '/assets/entertainment/' + kind + '/back.svg'
  return <li className="cn-ent-card-slot">
    <span>{t('cards.position', { number: card.position })}</span>
    <button type="button" className={'cn-ent-card cn-ent-card--' + kind + (revealed ? ' is-revealed' : '')} aria-label={revealed ? t('artwork.zoom', { name: label }) : t('cards.reveal', { number: card.position })} onClick={() => revealed ? setShowImage(true) : onReveal()} disabled={(!revealed && expired) || (revealed && !artwork)}>
      {revealed && !artwork ? <span className="cn-ent-card-fallback"><strong>{label}</strong><small>{t('artwork.unavailable')}</small></span> : <CardArtwork key={path} path={path} label={revealed ? label : t('cards.reveal', { number: card.position })} reversed={revealed && kind === 'tarot' && card.orientation === 'REVERSED'} />}
    </button>
    <span className="cn-ent-card-caption">{revealed ? <><strong>{label}</strong>{kind === 'tarot' ? <small>{t(card.orientation === 'REVERSED' ? 'cards.reversed' : 'cards.upright')}</small> : null}</> : t('cards.tap')}</span>
    {artwork ? <CardImageDialog show={showImage} path={artwork.path} label={label} orientation={kind === 'tarot' ? card.orientation : undefined} onClose={() => setShowImage(false)} /> : null}
  </li>
}
