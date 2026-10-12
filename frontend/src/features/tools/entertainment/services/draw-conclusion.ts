import { TAROT_MAJOR_CUES } from '../data/tarot-major-conclusion-cues'
import { TAROT_WANDS_CUES } from '../data/tarot-wands-conclusion-cues'
import { TAROT_CUPS_CUES } from '../data/tarot-cups-conclusion-cues'
import { TAROT_SWORDS_CUES } from '../data/tarot-swords-conclusion-cues'
import { TAROT_PENTACLES_CUES } from '../data/tarot-pentacles-conclusion-cues'
import { PLAYING_CARD_CUES } from '../data/playing-card-conclusion-cues'
import type { CardConclusionCue, InterpretedCard } from '../types/conclusion.types'
import type { CardIdentity, DeckKind } from '../types/entertainment.types'
import type { SpreadRole } from '../config/draw-spreads'
import { firstSentence, type ReadingSummary } from './reading-summary'

export const TAROT_CONCLUSION_CUES = { ...TAROT_MAJOR_CUES, ...TAROT_WANDS_CUES, ...TAROT_CUPS_CUES, ...TAROT_SWORDS_CUES, ...TAROT_PENTACLES_CUES }

export function cardConclusionCue(kind: DeckKind, card: CardIdentity): CardConclusionCue | null {
  if (kind === 'cards') return card.orientation === 'UPRIGHT' && Object.hasOwn(PLAYING_CARD_CUES, card.id) ? PLAYING_CARD_CUES[card.id] : null
  if (!Object.hasOwn(TAROT_CONCLUSION_CUES, card.id) || !['UPRIGHT', 'REVERSED'].includes(card.orientation)) return null
  return TAROT_CONCLUSION_CUES[card.id][card.orientation]
}

function conclusionAdvice(item: InterpretedCard, cue: CardConclusionCue) {
  return cue.advice ?? item.meaning!.advice
}

function reasoning(item: InterpretedCard, cue: CardConclusionCue) {
  return item.position!.role === 'obstacle' ? cue.obstacleReason : cue.reason ?? firstSentence(item.meaning!.text)
}

export function drawConclusion(kind: DeckKind, cards: readonly InterpretedCard[], labelOf: (card: CardIdentity) => string): ReadingSummary | null {
  if (!cards.length || cards.some(item => !item.meaning || !item.position)) return null
  const interpreted = [...cards].sort((a, b) => a.card.position - b.card.position).map(item => ({ ...item, cue: cardConclusionCue(kind, item.card) }))
  if (interpreted.some(item => !item.cue) || new Set(interpreted.map(item => item.card.position)).size !== cards.length) return null
  const find = (role: SpreadRole) => interpreted.find(item => item.position!.role === role)
  const main = find('situation') ?? interpreted[0]
  const obstacle = find('obstacle')
  const support = find('support')
  const direction = find('direction')
  const action = find('advice') ?? find('step')
  if (!action) return null
  const paragraphs = [main.cue!.overview + (obstacle ? ` ${obstacle.cue!.obstacle}` : '')]
  if (support) paragraphs.push(support.cue!.support ?? conclusionAdvice(support, support.cue!))
  if (direction) paragraphs.push(direction.cue!.direction)
  return {
    conclusion: { paragraphs, advice: conclusionAdvice(action, action.cue!) },
    items: interpreted.map(item => ({
      label: `${labelOf(item.card)}${kind === 'tarot' ? ` (${item.card.orientation === 'REVERSED' ? 'ngược' : 'xuôi'})` : ''}`,
      role: item.position!.title, text: reasoning(item, item.cue!),
    })),
    advice: { label: labelOf(action.card), text: conclusionAdvice(action, action.cue!) },
  }
}
