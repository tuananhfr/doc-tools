import type { TextRun } from '../types/text-layer.types'

/** Removing a word carrying EOL must not join its surviving row to a different
 * reading or the next row. Keep boundaries even for partially replaced lines. */
export function excludeOcrRuns(runs: TextRun[], removed: ReadonlySet<TextRun>): TextRun[] {
  const result: TextRun[] = []
  let row: TextRun[] = []
  const flush = () => {
    if (row.length) {
      row[row.length - 1].eol = true
      result.push(...row)
    }
    row = []
  }
  for (const run of runs) {
    const end = run.eol
    if (!removed.has(run)) row.push(run)
    if (end) flush()
  }
  flush()
  return result
}
