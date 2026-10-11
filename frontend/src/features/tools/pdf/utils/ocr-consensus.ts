import type { OcrCandidate, OcrWordResult } from '../types/ocr-result.types'
import type { OcrPass } from '../types/ocr-profile.types'
import { alignWords } from './ocr-alignment'

export interface OcrPassWords { pass: OcrPass; words: OcrWordResult[]; engineVersion: string; targetWordIds?: string[] }
const candidate = (word: OcrWordResult, pass: OcrPassWords): OcrCandidate => ({ id: `${pass.pass}:${word.id}`, engine: 'tesseract', engineVersion: pass.engineVersion, pass: pass.pass, rawText: word.rawText, score: word.confidence, bbox: word.bbox })
const comparable = (text: string) => text.normalize('NFC').replace(/\s+/gu, '')

/** Agreement between correlated passes never upgrades the engine's score. */
export function mergeOcrPasses(passes: OcrPassWords[]): OcrWordResult[] {
  if (!passes.length) return []
  let words = passes[0].words.map(word => ({ ...word, candidates: [candidate(word, passes[0])] }))
  for (const pass of passes.slice(1)) {
    const aligned = alignWords(words, pass.words)
    words = words.map((word, index) => {
      if (pass.targetWordIds && !pass.targetWordIds.includes(word.id)) return word
      const matches = aligned.matches[index].map(item => item.candidate)
      const joined = matches.map(item => item.rawText).join(' ')
      const reasons = new Set(word.reviewReasons ?? [])
      if (!matches.length) reasons.add('unmatched')
      else if (comparable(joined) !== comparable(word.rawText)) reasons.add('disagreement')
      const next = matches.map(item => candidate(item, pass))
      // Segmentation differences remain visible as a whole-value alternative.
      if (matches.length > 1) next.push({ ...candidate(word, pass), id: `${pass.pass}:group:${word.id}`, rawText: joined, score: Math.min(...matches.map(item => item.confidence)) })
      return { ...word, candidates: [...word.candidates, ...next], reviewReasons: [...reasons] }
    })
    for (const [index, word] of aligned.unmatched.entries()) {
      const box = word.previewBox, cy = box.y + box.height / 2
      const sameLine = words.filter(current => Math.abs(current.previewBox.y + current.previewBox.height / 2 - cy) <= Math.max(box.height, current.previewBox.height) / 2)
      const anchor = sameLine[0]
      const insertion = words.findIndex(current => {
        const other = current.previewBox, otherY = other.y + other.height / 2
        return sameLine.includes(current) ? other.x > box.x : otherY > cy + Math.max(box.height, other.height) / 2
      })
      const extra = { ...word, id: `${anchor?.id.split(':')[0] ?? `extra-${pass.pass}-${index}`}:extra-${pass.pass}-${index}`, candidates: [candidate(word, pass)], reviewReasons: ['unmatched'] as OcrWordResult['reviewReasons'] }
      words.splice(insertion < 0 ? words.length : insertion, 0, extra)
    }
  }
  return words.map(word => {
    const best = word.candidates.reduce((selected, current) => current.score > selected.score ? current : selected)
    if (comparable(best.rawText) === comparable(word.rawText) || best.score < 85 || best.score < word.confidence + 10) return word
    return { ...word, normalizedText: best.rawText.trim().normalize('NFC'), proposedCandidateId: best.id, contentType: /\p{N}/u.test(word.rawText + best.rawText) ? 'numeric' as const : word.contentType,
      reviewReasons: [...new Set([...(word.reviewReasons ?? []), 'disagreement' as const])] }
  })
}
