import type { OcrLine } from './ocr-runs'

export type OcrQuarterTurn = 0 | 90 | 180 | 270
export interface OcrOrientationReading { rotation: OcrQuarterTurn; letters: number; words: number; confidence: number; score: number }

/** Use horizontal, legible words rather than page aspect or grid lines. A real
 * landscape document must not rotate just because its paper is wide.
 */
export function scoreOcrOrientation(rotation: OcrQuarterTurn, lines: OcrLine[]): OcrOrientationReading {
  let letters = 0, words = 0, weighted = 0, score = 0
  for (const word of lines.flatMap(line => line.words)) {
    const count = (word.text.match(/\p{L}/gu) ?? []).length
    const box = word.bbox, width = box.x1 - box.x0, height = box.y1 - box.y0
    if (count < 2 || word.confidence < 60 || width < height * .6 || count < word.text.replace(/\s/g, '').length * .65) continue
    const weight = Math.min(20, count)
    letters += weight; words++; weighted += weight * word.confidence
    score += weight * ((word.confidence - 45) / 55) ** 2
  }
  return { rotation, letters, words, confidence: weighted / Math.max(1, letters), score }
}

export const strongOcrOrientation = (reading: OcrOrientationReading) => reading.letters >= 120 && reading.words >= 20 && reading.confidence >= 90

/** Ambiguous/blank photos stay as supplied. Recognition confidence is evidence
 * for orientation, not a claim that the recognized text is correct.
 */
export function selectOcrOrientation(readings: OcrOrientationReading[]): OcrQuarterTurn {
  const original = readings.find(reading => reading.rotation === 0)
  if (!original) return 0
  const best = readings.reduce((a, b) => b.score > a.score ? b : a, original)
  return best.rotation !== 0 && best.letters >= 30 && best.words >= 5 && best.confidence >= 75
    && best.score > original.score * 1.4 + 10 ? best.rotation : 0
}
