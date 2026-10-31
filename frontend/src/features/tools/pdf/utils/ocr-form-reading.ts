import type { OcrLine } from './ocr-runs'

const length = (lines: OcrLine[]) => lines.flatMap(line => line.words).reduce((sum, word) => sum + word.text.replace(/[^\p{L}\p{N}]/gu, '').length, 0)
const score = (lines: OcrLine[]) => {
  const words = lines.flatMap(line => line.words)
  return words.reduce((sum, word) => sum + word.confidence * word.text.length, 0) / Math.max(1, words.reduce((sum, word) => sum + word.text.length, 0))
}
const digits = (text: string) => (text.match(/\d/g) ?? []).join('')

/** Replace only the words covered by a fuller row reading; other fields stay.
 * A crop's high average score must not overwrite a clear original identifier. */
export function mergeFormReadings(existing: OcrLine[], recovered: OcrLine[]) {
  let result = structuredClone(existing)
  for (const candidate of recovered) {
    const b = candidate.bbox
    const inside = (word: OcrLine['words'][number]) => {
      const x = (word.bbox.x0 + word.bbox.x1) / 2, y = (word.bbox.y0 + word.bbox.y1) / 2
      return x >= b.x0 - 3 && x <= b.x1 + 3 && y >= b.y0 - 2 && y <= b.y1 + 2
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
      return old && digits(old.text) !== digits(word.text) && (damagedNumber || !digits(word.text) || word.confidence < old.confidence + 3) ? { ...word, text: old.text, confidence: old.confidence } : word
    }) }
    const fuller = length([next]) > length(matched) * 1.04 && score([next]) >= score(matched) - 2
      || length([next]) > length(matched) * 1.1 && score([next]) >= score(matched) - 5
    const label = next.words.map(word => word.text).join(' ').endsWith(':')
    if (matched.length ? length([next]) < length(matched) * .95 || !fuller && score([next]) < score(matched) + 1 : score([next]) < (label ? 80 : 85)) continue
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
  return result.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0)
}
