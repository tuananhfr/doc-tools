import { DRAW_SPREADS } from '../config/draw-spreads'
import { PLAYING_CARD_MEANINGS } from '../data/playing-card-meanings'
import { TAROT_MAJOR } from '../data/tarot-major'
import { TAROT_WANDS } from '../data/tarot-wands'
import { TAROT_CUPS } from '../data/tarot-cups'
import { TAROT_SWORDS } from '../data/tarot-swords'
import { TAROT_PENTACLES } from '../data/tarot-pentacles'
import type { CardIdentity, DeckKind, DrawResult } from '../types/entertainment.types'
import type { Interpretation, TarotInterpretation } from '../types/interpretation.types'
import { drawConclusion } from './draw-conclusion'

export const TAROT_MEANINGS: Readonly<Record<string, TarotInterpretation>> = { ...TAROT_MAJOR, ...TAROT_WANDS, ...TAROT_CUPS, ...TAROT_SWORDS, ...TAROT_PENTACLES }

export function cardMeaning(kind: DeckKind, card: CardIdentity): Interpretation | null {
  if (kind === 'cards') return card.orientation === 'UPRIGHT' && Object.hasOwn(PLAYING_CARD_MEANINGS, card.id) ? PLAYING_CARD_MEANINGS[card.id] : null
  if (!Object.hasOwn(TAROT_MEANINGS, card.id) || !['UPRIGHT', 'REVERSED'].includes(card.orientation)) return null
  return TAROT_MEANINGS[card.id][card.orientation]
}

export function drawReading(result: DrawResult, labelOf: (card: CardIdentity) => string = card => card.name ?? card.id) {
  const spread = DRAW_SPREADS[result.cards.length]
  const cards = result.cards.map(card => ({ card, position: spread?.positions[card.position - 1], meaning: cardMeaning(result.kind, card) }))
  const summary = drawConclusion(result.kind, cards, labelOf)
  return { spread, cards, summary }
}
