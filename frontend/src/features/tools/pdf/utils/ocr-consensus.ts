import type { OcrCandidate, OcrWordResult } from '../types/ocr-result.types'
import type { OcrPass } from '../types/ocr-profile.types'
import { alignWords } from './ocr-alignment'

export interface OcrPassWords { pass: OcrPass; words: OcrWordResult[]; engineVersion: string; targetWordIds?: string[] }
const candidate = (word: OcrWordResult, pass: OcrPassWords): OcrCandidate => ({ id: `${pass.pass}:${word.id}`, engine: 'tesseract', engineVersion: pass.engineVersion, pass: pass.pass, rawText: word.rawText, score: word.confidence, bbox: word.bbox })
const comparable = (text: string) => text.normalize('NFC').replace(/\s+/gu, '')

/** Count repeated tokens separately: extra noise must not masquerade as recovered text. */
function retainedContent(original: OcrPassWords, alternative: OcrPassWords) {
  const tokens = (pass: OcrPassWords) => pass.words.flatMap(word => word.rawText.normalize('NFC').toLocaleLowerCase('vi').match(/[\p{L}\p{N}]+/gu) ?? [])
  const remaining = new Map<string, number>()
  for (const token of tokens(alternative)) remaining.set(token, (remaining.get(token) ?? 0) + 1)
  let total = 0, retained = 0
  for (const token of tokens(original)) {
    total += token.length
    const count = remaining.get(token) ?? 0
    if (count) { retained += token.length; remaining.set(token, count - 1) }
  }
  return total ? retained / total : 0
}

/** Export one coherent reading; alternative-pass fragments remain available for optional review. */
export function selectOcrExportPass(passes: OcrPassWords[]): OcrPassWords | undefined {
  const complete = passes.filter(pass => !pass.targetWordIds)
  const primary = complete[0]
  if (!primary) return undefined
  const characters = (pass: OcrPassWords) => pass.words.reduce((sum, word) => sum + word.rawText.replace(/\s/gu, '').length, 0)
  const score = (pass: OcrPassWords) => {
    let total = 0, weighted = 0
    for (const word of pass.words) { const length = word.rawText.length; total += length; weighted += length * word.confidence }
    return total ? weighted / total : 0
  }
  let selected = primary
  const baseline = characters(primary)
  for (const pass of complete.slice(1)) {
    const count = characters(pass)
    // A tiny high-confidence snippet must not replace an otherwise complete page.
    if (baseline && count < baseline * .75) continue
    // A short reading can still score highly after dropping difficult words.
    // Accept a longer local reading when it retains most existing content and
    // has a higher, strong score; length alone must not reject recovered lines.
    const strongRecovery = pass.pass === 'local' && score(pass) >= 90 && score(pass) > score(selected) && retainedContent(selected, pass) >= .85
    if (baseline && count > baseline * 1.35 && !strongRecovery && (pass.pass !== 'local' || score(pass) < 85 || score(pass) < score(selected) + 5)) continue
    const gain = pass.pass === 'local' ? 2 : 5
    const recovered = pass.pass === 'local' && count >= characters(selected) * 1.02 && score(pass) >= score(selected)
    if (recovered || score(pass) >= score(selected) + gain) selected = pass
  }
  return selected
}

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
