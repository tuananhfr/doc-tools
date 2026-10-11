import { randomInt } from 'node:crypto'
import { DECKS } from '../data/deck-manifests'
import { entError } from '../entertainment-policy'
import type { DeckKind, DrawInput, DrawResult } from '../entertainment.types'

export function parseDraw(kind: DeckKind, body: unknown): DrawInput {
  if (!body || typeof body !== 'object' || Array.isArray(body)) entError(400, 'INVALID_DRAW')
  const value = body as Record<string, unknown>
  const spreads = kind === 'cards' ? [1, 3, 5, 7, 9] : [1, 3, 5, 7, 10]
  if (Object.keys(value).some(key => !['spread', 'reversed'].includes(key)) || !spreads.includes(value.spread as number) || typeof value.reversed !== 'boolean' || (kind === 'cards' && value.reversed)) entError(400, 'INVALID_DRAW')
  return { spread: value.spread as number, reversed: value.reversed }
}
export function drawCards(kind: DeckKind, input: DrawInput, expires: number, random: (max: number) => number = randomInt): DrawResult {
  const deck = [...DECKS[kind]]
  for (let index = deck.length - 1; index > 0; index--) {
    const target = random(index + 1)
    ;[deck[index], deck[target]] = [deck[target], deck[index]]
  }
  return { kind, expires_at: expires, cards: deck.slice(0, input.spread).map((card, index) => ({ ...card, position: index + 1, orientation: input.reversed && random(2) === 1 ? 'REVERSED' : 'UPRIGHT' })) }
}
