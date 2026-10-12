import type { Interpretation, MeaningRow, TarotInterpretation } from '../types/interpretation.types'

export function meaning([keywords, text, advice, themes]: MeaningRow): Interpretation {
  return { keywords: keywords.split(' · '), text, advice, themes }
}

export function tarotMeanings(rows: Readonly<Record<string, readonly [MeaningRow, MeaningRow]>>): Record<string, TarotInterpretation> {
  return Object.fromEntries(Object.entries(rows).map(([id, [upright, reversed]]) => [id, { UPRIGHT: meaning(upright), REVERSED: meaning(reversed) }]))
}
