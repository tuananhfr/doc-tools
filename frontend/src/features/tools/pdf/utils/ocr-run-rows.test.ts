import { expect, it } from 'vitest'
import { excludeOcrRuns } from './ocr-run-rows'
import type { TextRun } from '../types/text-layer.types'
const run = (text: string, eol: boolean) => ({ text, eol } as TextRun)
it('keeps the surviving row end when its original final word is replaced', () => {
  const a = run('orphan', false), b = run('replaced', true), c = run('next row', true)
  const result = excludeOcrRuns([a, b, c], new Set([b]))
  expect(result.map(run => [run.text, run.eol])).toEqual([['orphan', true], ['next row', true]])
})
it('omits fully replaced rows without merging neighboring rows', () => {
  const a = run('first', true), b = run('removed', true), c = run('last', false)
  expect(excludeOcrRuns([a, b, c], new Set([b])).map(run => [run.text, run.eol])).toEqual([['first', true], ['last', true]])
})
