import type { PageText, TextRun } from '../types/text-layer.types'
import { plainText } from './plain-text'
import { gapBetween } from './text-search'

/** Retain readable source spacing without forcing curved-photo coordinates onto the PDF. */
export function ocrPaperText(page: PageText): string {
  if (!page.runs.length || !page.runs.every(run => run.fontName === 'ocr')) return plainText(page)
  const lines: TextRun[][] = []
  let line: TextRun[] = []
  for (const run of page.runs) {
    line.push(run)
    if (run.eol) { lines.push(line); line = [] }
  }
  if (line.length) lines.push(line)
  const distances = lines.map((row, index) => {
    if (!index) return 0
    const previous = lines[index - 1][0], first = row[0]
    if (Math.abs(previous.angle - first.angle) > 3) return 0
    const radians = previous.angle * Math.PI / 180
    return Math.abs((first.origin.x - previous.origin.x) * Math.sin(radians) + (first.origin.y - previous.origin.y) * Math.cos(radians))
  })
  const gaps = distances.filter(value => value > 0).sort((a, b) => a - b)
  const typical = gaps[Math.floor(gaps.length / 2)] ?? Infinity
  return lines.map((row, index) => {
    const text = row.map((run, wordIndex) => {
      const previous = row[wordIndex - 1]
      const gap = previous && gapBetween(previous, run) > Math.max(previous.size, run.size) * 1.5 ? '    ' : ' '
      return `${wordIndex ? gap : ''}${run.text.trim()}`
    }).join('')
    const paragraph = distances[index] > typical * 1.6 && distances[index] > row[0].size * 1.6
    return `${paragraph ? '\n' : ''}${text}`
  }).join('\n').trim()
}
