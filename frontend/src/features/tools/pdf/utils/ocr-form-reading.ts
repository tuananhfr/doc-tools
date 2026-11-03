import type { OcrLine } from './ocr-runs'
import { cleanPrintedLines } from './ocr-print-lines'

const length = (lines: OcrLine[]) => lines.flatMap(line => line.words).reduce((sum, word) => sum + word.text.replace(/[^\p{L}\p{N}]/gu, '').length, 0)
const score = (lines: OcrLine[]) => {
  const words = lines.flatMap(line => line.words)
  return words.reduce((sum, word) => sum + word.confidence * word.text.length, 0) / Math.max(1, words.reduce((sum, word) => sum + word.text.length, 0))
}
const digits = (text: string) => (text.match(/\d/g) ?? []).join('')
const key = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]/gu, '').toLowerCase()
const overlaps = (a: OcrLine['words'][number], b: OcrLine['words'][number]) => {
  const x = Math.max(0, Math.min(a.bbox.x1, b.bbox.x1) - Math.max(a.bbox.x0, b.bbox.x0))
  const y = Math.max(0, Math.min(a.bbox.y1, b.bbox.y1) - Math.max(a.bbox.y0, b.bbox.y0))
  return x > Math.min(a.bbox.x1 - a.bbox.x0, b.bbox.x1 - b.bbox.x0) * .5
    && y > Math.min(a.bbox.y1 - a.bbox.y0, b.bbox.y1 - b.bbox.y0) * .4
}

/** Replace only the words covered by a fuller row reading; other fields stay.
 * A crop's high average score must not overwrite a clear original identifier. */
export function mergeFormReadings(existing: OcrLine[], recovered: OcrLine[]) {
  let result = structuredClone(existing)
  for (const candidate of recovered) {
    const b = candidate.bbox
    const inside = (word: OcrLine['words'][number]) => {
      const x = (word.bbox.x0 + word.bbox.x1) / 2, y = (word.bbox.y0 + word.bbox.y1) / 2
      if (!(x >= b.x0 - 3 && x <= b.x1 + 3 && y >= b.y0 - 2 && y <= b.y1 + 2)) return false
      // A tall accent or stamp fragment can overlap the next row's rectangle.
      // Match actual glyph centres, not the enclosing line rectangle alone.
      return candidate.words.some(other => {
        const nextY = (other.bbox.y0 + other.bbox.y1) / 2
        const height = Math.min(word.bbox.y1 - word.bbox.y0, other.bbox.y1 - other.bbox.y0)
        return Math.abs(y - nextY) <= height * .7 + 1
          && Math.min(word.bbox.x1, other.bbox.x1) > Math.max(word.bbox.x0, other.bbox.x0)
      })
    }
    const matched = result.map(line => ({ ...line, words: line.words.filter(inside) })).filter(line => line.words.length)
    const originalWords = matched.flatMap(line => line.words)
    const next = { ...candidate, words: candidate.words.map(word => {
      const old = originalWords.find(old => {
        const overlap = Math.max(0, Math.min(old.bbox.x1, word.bbox.x1) - Math.max(old.bbox.x0, word.bbox.x0))
        return (old.confidence >= 85 || /^\d[\d.,/-]*$/.test(old.text) && (!digits(word.text) && word.confidence < 85 || /\p{L}/u.test(word.text) && word.confidence < 90))
          && /\d/.test(old.text) && overlap > Math.min(old.bbox.x1 - old.bbox.x0, word.bbox.x1 - word.bbox.x0) * .6
      })
      const damagedNumber = old && /^\d[\d.,/-]*$/.test(old.text) && /\p{L}/u.test(word.text) && word.confidence < 90
      if (old && digits(old.text) !== digits(word.text) && (damagedNumber || !digits(word.text) || word.confidence < old.confidence + 3)) return { ...word, text: old.text, confidence: old.confidence }
      const aligned = originalWords.filter(original => overlaps(original, word))
      const printed = aligned.length === 1 && aligned[0].confidence >= 90 && word.confidence < aligned[0].confidence + 3 ? aligned[0] : undefined
      return printed ? { ...word, text: printed.text, confidence: printed.confidence } : word
    }) }
    const fuller = length([next]) > length(matched) * 1.04 && score([next]) >= score(matched) - 2
      || length([next]) > length(matched) * 1.1 && score([next]) >= score(matched) - 5
    const label = next.words.map(word => word.text).join(' ').endsWith(':')
    // A whole line has more difficult characters than its already-readable tail.
    // Recover a missing prefix/suffix using aligned agreeing anchors, keeping the
    // clear old words above. Comparing only average scores discarded that text.
    const anchors = originalWords.filter(word => word.confidence >= 75 && key(word.text).length >= 2)
    const agrees = anchors.filter(word => candidate.words.some(other => overlaps(word, other) && key(word.text) === key(other.text))).length
    const additions = next.words.filter(word => word.confidence >= 80 && key(word.text).length >= 2 && !originalWords.some(old => overlaps(old, word)))
    const extendsFragment = length([next]) > length(matched) * 1.08 && score([next]) >= 65 && anchors.length >= 2
      && agrees >= anchors.length * .6 && additions.length >= 2
    if (matched.length ? length([next]) < length(matched) * .95 || !fuller && !extendsFragment && score([next]) < score(matched) + 1 : score([next]) < (label ? 80 : 85)) continue
    let inserted = false
    result = result.map(line => {
      if (!line.words.some(inside)) return line
      let words = line.words.filter(word => !inside(word))
      if (words.length && !inserted) { words = [...words, ...next.words].sort((a, b) => a.bbox.x0 - b.bbox.x0); inserted = true }
      if (!words.length) return { ...line, words }
      return { ...line, words, bbox: { x0: Math.min(...words.map(w => w.bbox.x0)), y0: Math.min(...words.map(w => w.bbox.y0)), x1: Math.max(...words.map(w => w.bbox.x1)), y1: Math.max(...words.map(w => w.bbox.y1)) } }
    }).filter(line => line.words.length)
    if (!inserted) result.push(next)
  }
  return cleanPrintedLines(result).sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
}
