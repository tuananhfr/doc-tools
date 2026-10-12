export type ReadingTheme = 'connection' | 'action' | 'resources' | 'clarity' | 'change' | 'rest' | 'balance' | 'learning'

export interface Interpretation {
  keywords: readonly string[]
  text: string
  advice: string
  themes: readonly ReadingTheme[]
}

export interface TarotInterpretation {
  UPRIGHT: Interpretation
  REVERSED: Interpretation
}

export type MeaningRow = readonly [keywords: string, text: string, advice: string, themes: readonly ReadingTheme[]]
