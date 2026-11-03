import type { OcrBox, OcrLine, OcrWord } from './ocr-runs'
import type { OcrWordResult } from '../types/ocr-result.types'

const characters = (text: string) => (text.match(/[\p{L}\p{N}]/gu) ?? []).length
const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] ?? 1
const boxOf = (words: OcrWord[]): OcrBox => ({ x0: Math.min(...words.map(w => w.bbox.x0)), y0: Math.min(...words.map(w => w.bbox.y0)), x1: Math.max(...words.map(w => w.bbox.x1)), y1: Math.max(...words.map(w => w.bbox.y1)) })

/** Two independent signs are required: uncertain recognition AND malformed/isolated ink.
 * Keep ordinary low-confidence words, numbers, math and punctuation for later correction. */
export function printedLineWords(words: OcrWord[]): OcrWord[] {
  const lexical = words.filter(word => characters(word.text))
  const weight = lexical.reduce((sum, word) => sum + characters(word.text), 0)
  const score = lexical.reduce((sum, word) => sum + characters(word.text) * word.confidence, 0) / Math.max(1, weight)
  const malformed = words.some(word => /[{}~`¦]|_{2,}/u.test(word.text))
  if (score < 30 && malformed && !lexical.some(word => word.confidence >= 70)) return []
  const anchors = lexical.filter(word => word.confidence >= 75 && characters(word.text) >= 2)
  const height = median((anchors.length ? anchors : lexical).map(word => word.bbox.y1 - word.bbox.y0).filter(h => h > 0))
  return words.filter(word => {
    if (!word.text.trim()) return false
    if (word.confidence < 35 && !characters(word.text) && !/^[*+−=/%-]$/u.test(word.text)) return false
    if (word.confidence < 35 && (word.text.match(/\./g) ?? []).length > word.text.length * .5 && characters(word.text)) return false
    const distance = Math.min(...anchors.filter(anchor => anchor !== word).map(anchor => Math.max(0, anchor.bbox.x0 - word.bbox.x1, word.bbox.x0 - anchor.bbox.x1)))
    if (anchors.length && distance > height * 3 && word.confidence < 60 && characters(word.text) <= 1) return false
    if (anchors.length && !characters(word.text) && word.bbox.y1 - word.bbox.y0 > height * 1.8) return false
    return true
  })
}

/** A signature flourish must not enlarge a nearby printed heading's bounding box.
 * Separate genuine columns before a recovered row is merged with the page reading. */
export function cleanPrintedLines(lines: OcrLine[]): OcrLine[] {
  const seen: OcrWord[] = []
  return lines.flatMap(line => {
    const words = printedLineWords(line.words).filter(word => {
      const repeated = seen.some(other => other.text.normalize('NFC').replace(/\p{P}/gu, '').toLowerCase() === word.text.normalize('NFC').replace(/\p{P}/gu, '').toLowerCase()
        && Math.max(0, Math.min(other.bbox.x1, word.bbox.x1) - Math.max(other.bbox.x0, word.bbox.x0)) > Math.min(other.bbox.x1 - other.bbox.x0, word.bbox.x1 - word.bbox.x0) * .6
        && Math.max(0, Math.min(other.bbox.y1, word.bbox.y1) - Math.max(other.bbox.y0, word.bbox.y0)) > Math.min(other.bbox.y1 - other.bbox.y0, word.bbox.y1 - word.bbox.y0) * .6)
      if (!repeated) seen.push(word)
      return !repeated
    }).sort((a, b) => a.bbox.x0 - b.bbox.x0)
    if (!words.length) return []
    const height = median(words.filter(word => characters(word.text) >= 2 && word.confidence >= 60).map(word => word.bbox.y1 - word.bbox.y0))
    const slope = Math.max(-.3, Math.min(.3, (line.baseline.y1 - line.baseline.y0) / Math.max(1, line.baseline.x1 - line.baseline.x0)))
    const at = (word: OcrWord) => (word.bbox.y0 + word.bbox.y1) / 2 - slope * (word.bbox.x0 + word.bbox.x1) / 2
    const rows: OcrWord[][] = []
    for (const word of words) {
      const row = rows.find(row => Math.abs(at(word) - median(row.map(at))) < Math.max(3, height * .65))
      if (row) row.push(word); else rows.push([word])
    }
    const groups: OcrWord[][] = []
    for (const row of rows) {
      let group: OcrWord[] = []
      for (const word of row) {
        if (group.length && height > 1 && word.bbox.x0 - group.at(-1)!.bbox.x1 > height * 4) { groups.push(group); group = [] }
        group.push(word)
      }
      if (group.length) groups.push(group)
    }
    return groups.flatMap(group => {
      if (!group.some(word => characters(word.text))) return []
      const bbox = boxOf(group)
      const glyphHeight = median(group.filter(word => characters(word.text)).map(word => word.bbox.y1 - word.bbox.y0))
      const attributes = line.rowAttributes
      const rowAttributes = attributes && attributes.rowHeight + Math.abs(attributes.descenders) < glyphHeight * 1.8
        ? attributes : { rowHeight: glyphHeight * .8, descenders: -glyphHeight * .2 }
      const baseline = { x0: bbox.x0, y0: bbox.y1 - glyphHeight * .15, x1: bbox.x1, y1: bbox.y1 - glyphHeight * .15 }
      return [{ ...line, words: group, bbox, baseline, rowAttributes }]
    })
  })
}

/** Filter display/export artifacts without deleting raw OCR provenance in the review model. */
export function filterPrintedExportWords(words: OcrWordResult[]): OcrWordResult[] {
  const result: OcrWordResult[] = []
  let row: OcrWordResult[] = []
  const flush = () => {
    const boxes = row.map(word => ({ text: word.rawText, confidence: word.confidence, bbox: {
      x0: word.previewBox.x * 1000, y0: word.previewBox.y * 1000,
      x1: (word.previewBox.x + word.previewBox.width) * 1000, y1: (word.previewBox.y + word.previewBox.height) * 1000,
    } }))
    const kept = new Set(printedLineWords(boxes))
    const cleaned = row.filter((_, index) => kept.has(boxes[index])).map(word => ({ ...word, run: { ...word.run, eol: false } }))
    if (cleaned.length) cleaned[cleaned.length - 1].run.eol = true
    result.push(...cleaned); row = []
  }
  for (const word of words) { row.push(word); if (word.run.eol) flush() }
  if (row.length) flush()
  return result
}
