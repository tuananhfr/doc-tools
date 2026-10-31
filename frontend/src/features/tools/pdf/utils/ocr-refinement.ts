import type { OcrLine } from './ocr-runs'
import type { OcrWordResult } from '../types/ocr-result.types'
import { alignWords } from './ocr-alignment'
import type { OcrPassWords } from './ocr-consensus'

// Keep letters, case, punctuation and digits. Only marks on the same printed
// letters may change automatically; a higher score is not permission to rewrite a name/code.
const letters = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '')
const canRefine = (before: string, score: number, after: string, nextScore: number) => before !== after
  && /\p{L}/u.test(before) && !/\d/u.test(before + after)
  && letters(before) === letters(after) && nextScore >= 90 && nextScore >= score + 8

/** Keep one complete reading and its geometry, accepting only strong aligned mark corrections. */
export function refineOcrExportWords(selected: OcrPassWords, passes: OcrPassWords[]): OcrWordResult[] {
  let words = selected.words.map(word => ({ ...word, run: { ...word.run } }))
  for (const pass of passes) {
    if (pass === selected || pass.targetWordIds) continue
    const aligned = alignWords(words, pass.words)
    const owners = new Map<number, number>()
    for (const group of aligned.matches) for (const item of group) owners.set(item.index, (owners.get(item.index) ?? 0) + 1)
    words = words.map((word, index) => {
      const group = aligned.matches[index]
      if (group.length !== 1 || owners.get(group[0].index) !== 1) return word
      const other = group[0].candidate
      if (!canRefine(word.rawText, word.confidence, other.rawText, other.confidence)) return word
      return { ...word, rawText: other.rawText, normalizedText: other.rawText.normalize('NFC'), confidence: other.confidence,
        run: { ...word.run, text: other.rawText.normalize('NFC') } }
    })
  }
  return words
}

/** Cell/strip candidates share a crop; match complete token sequences before accepting marks. */
export function refineOcrLineMarks(selected: OcrLine[], alternatives: OcrLine[][]): OcrLine[] {
  const result = selected.map(line => ({ ...line, words: line.words.map(word => ({ ...word })) }))
  for (const alternative of alternatives) {
    if (alternative.length !== result.length) continue
    result.forEach((line, index) => {
      const other = alternative[index].words
      if (other.length !== line.words.length || other.some((word, i) => letters(word.text) !== letters(line.words[i].text))) return
      line.words.forEach((word, i) => {
        if (canRefine(word.text, word.confidence, other[i].text, other[i].confidence)) {
          word.text = other[i].text.normalize('NFC'); word.confidence = other[i].confidence
        }
      })
    })
  }
  return result
}
