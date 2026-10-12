import type { CardConclusionCue, CardCueRow } from '../types/conclusion.types'

function cue([overview, obstacle, obstacleReason, direction, tone, extras]: CardCueRow): CardConclusionCue {
  return { overview, obstacle, obstacleReason, direction, tone, ...extras }
}

export function tarotCues(rows: Readonly<Record<string, readonly [CardCueRow, CardCueRow]>>) {
  return Object.fromEntries(Object.entries(rows).map(([id, [upright, reversed]]) => [id, { UPRIGHT: cue(upright), REVERSED: cue(reversed) }]))
}

export function playingCardCues(rows: Readonly<Record<string, CardCueRow>>) {
  return Object.fromEntries(Object.entries(rows).map(([id, row]) => [id, cue(row)]))
}
