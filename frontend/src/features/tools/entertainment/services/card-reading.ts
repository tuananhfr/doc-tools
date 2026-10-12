import { DRAW_SPREADS } from '../config/draw-spreads'
import { PLAYING_CARD_MEANINGS } from '../data/playing-card-meanings'
import { TAROT_MAJOR } from '../data/tarot-major'
import { TAROT_WANDS } from '../data/tarot-wands'
import { TAROT_CUPS } from '../data/tarot-cups'
import { TAROT_SWORDS } from '../data/tarot-swords'
import { TAROT_PENTACLES } from '../data/tarot-pentacles'
import type { CardIdentity, DeckKind, DrawResult } from '../types/entertainment.types'
import type { Interpretation, TarotInterpretation } from '../types/interpretation.types'
import { firstSentence, type ReadingSummary } from './reading-summary'

export const TAROT_MEANINGS: Readonly<Record<string, TarotInterpretation>> = { ...TAROT_MAJOR, ...TAROT_WANDS, ...TAROT_CUPS, ...TAROT_SWORDS, ...TAROT_PENTACLES }

export function cardMeaning(kind: DeckKind, card: CardIdentity): Interpretation | null {
  if (kind === 'cards') return card.orientation === 'UPRIGHT' && Object.hasOwn(PLAYING_CARD_MEANINGS, card.id) ? PLAYING_CARD_MEANINGS[card.id] : null
  if (!Object.hasOwn(TAROT_MEANINGS, card.id) || !['UPRIGHT', 'REVERSED'].includes(card.orientation)) return null
  return TAROT_MEANINGS[card.id][card.orientation]
}

export function drawReading(result: DrawResult, labelOf: (card: CardIdentity) => string = card => card.name ?? card.id) {
  const spread = DRAW_SPREADS[result.cards.length]
  const cards = result.cards.map(card => ({ card, position: spread?.positions[card.position - 1], meaning: cardMeaning(result.kind, card) }))
  let summary: ReadingSummary | null = null
  if (cards.length && cards.every(item => item.meaning)) {
    const advice = cards.find(item => item.position?.title === 'Lời khuyên')
    summary = {
      items: cards.map(({ card, position, meaning }) => ({
        label: `${labelOf(card)}${result.kind === 'tarot' ? ` (${card.orientation === 'REVERSED' ? 'ngược' : 'xuôi'})` : ''}`,
        role: position?.title ?? `Lá ${card.position}`,
        text: firstSentence(meaning!.text),
      })),
      ...(advice ? { advice: { label: labelOf(advice.card), text: advice.meaning!.advice } } : {}),
    }
  }
  return { spread, cards, summary }
}
