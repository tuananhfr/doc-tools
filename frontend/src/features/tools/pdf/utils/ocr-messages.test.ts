import fs from 'node:fs'
import path from 'node:path'
import { expect, it } from 'vitest'
import { LOCALES } from '@/i18n/locales'

function fields(value: Record<string, unknown>, prefix = '', result = new Map<string, string>()): Map<string, string> {
  for (const [key, text] of Object.entries(value)) {
    const field = prefix ? `${prefix}.${key}` : key
    if (typeof text === 'string') result.set(field, text)
    else fields(text as Record<string, unknown>, field, result)
  }
  return result
}
const root = path.resolve(import.meta.dirname, '../../../../i18n/messages')

it.each(LOCALES)('keeps OCR review labels and placeholders complete in $code', locale => {
  const read = (code: string) => fields(JSON.parse(fs.readFileSync(path.join(root, code, 'pdf.json'), 'utf8')).ocrReview)
  const source = read('vi')
  const target = read(locale.code)
  const base = (key: string) => key.replace(/_(zero|one|two|few|many|other)$/, '')
  expect([...new Set([...target.keys()].map(base))].sort()).toEqual([...source.keys()].sort())
  for (const [key, value] of target) {
    expect(value.trim()).not.toBe('')
    expect([...value.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort()).toEqual([...source.get(base(key))!.matchAll(/\{\{(\w+)\}\}/g)].map(match => match[1]).sort())
  }
  if (new Intl.PluralRules(locale.intl).resolvedOptions().pluralCategories.length > 1) {
    expect([...target.keys()].filter(key => key.startsWith('remaining_')).map(key => key.slice('remaining_'.length)).sort()).toEqual(new Intl.PluralRules(locale.intl).resolvedOptions().pluralCategories.sort())
  }
})
