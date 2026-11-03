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

function oneLetterApart(a: string, b: string) {
  const left = Array.from(a), right = Array.from(b)
  if (left.length < 3 || left.length !== right.length) return false
  return left.filter((letter, index) => letter !== right[index]).length === 1
}

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
  // Different segmentation may add a stamp/signature line, so line counts alone
  // cannot align readings. Accept a one-letter correction only when two separate
  // views agree on the same glyph box and the selected word is uncertain.
  for (const line of result) for (const word of line.words) {
    if (word.confidence >= 75 || /\d/.test(word.text) || !/\p{L}{3}/u.test(word.text)) continue
    const votes = new Map<string, { count: number; confidence: number }>()
    for (const alternative of alternatives) {
      const matches = alternative.flatMap(line => line.words).filter(other => {
        if (other.confidence < 85 || /\d/.test(other.text) || !oneLetterApart(word.text.normalize('NFC'), other.text.normalize('NFC'))) return false
        const x = Math.max(0, Math.min(word.bbox.x1, other.bbox.x1) - Math.max(word.bbox.x0, other.bbox.x0))
        const y = Math.max(0, Math.min(word.bbox.y1, other.bbox.y1) - Math.max(word.bbox.y0, other.bbox.y0))
        const area = (value: typeof word) => (value.bbox.x1 - value.bbox.x0) * (value.bbox.y1 - value.bbox.y0)
        return x * y >= Math.min(area(word), area(other)) * .6 && Math.max(area(word), area(other)) <= Math.min(area(word), area(other)) * 2.5
      }).sort((a, b) => b.confidence - a.confidence)
      const candidate = matches[0]
      if (!candidate) continue
      const key = candidate.text.normalize('NFC'), previous = votes.get(key)
      votes.set(key, { count: (previous?.count ?? 0) + 1, confidence: Math.max(previous?.confidence ?? 0, candidate.confidence) })
    }
    const candidate = [...votes.entries()].sort((a, b) => b[1].count - a[1].count || b[1].confidence - a[1].confidence)[0]
    if (candidate && candidate[1].count >= 2 && candidate[1].confidence >= 90 && candidate[1].confidence >= word.confidence + 12) {
      word.text = candidate[0]; word.confidence = candidate[1].confidence
    }
  }
  return result
}
