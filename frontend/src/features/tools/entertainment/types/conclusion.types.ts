import type { CardIdentity, Metric } from './entertainment.types'
import type { SpreadPosition } from '../config/draw-spreads'
import type { Interpretation } from './interpretation.types'
import type { NumerologyInterpretation } from '../data/numerology-meanings'

export type CardTone = 'positive' | 'difficult' | 'mixed'
export interface CardConclusionCue {
  overview: string
  obstacle: string
  obstacleReason: string
  direction: string
  tone: CardTone
  reason?: string
  advice?: string
  support?: string
}
export type CardCueRow = readonly [overview: string, obstacle: string, obstacleReason: string, direction: string, tone: CardTone, extras?: { reason?: string; advice?: string; support?: string }]
export interface InterpretedCard { card: CardIdentity; position?: SpreadPosition; meaning: Interpretation | null }
export interface ConclusionPeriod { title: string; text: string; advice: string }
export interface ReadingConclusion { paragraphs: readonly string[]; advice: string; period?: ConclusionPeriod }
export interface InterpretedMetric { metric: Metric; meaning: NumerologyInterpretation | null }
