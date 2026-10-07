import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCALE, LOCALES } from './locales'
import { NAMESPACES } from './resources'

const root = path.join(import.meta.dirname, 'messages')
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/

function flatten(value: unknown, prefix = '', out = new Map<string, string>()): Map<string, string> {
  if (typeof value === 'string') out.set(prefix, value)
  else if (value && typeof value === 'object' && !Array.isArray(value)) for (const [key, child] of Object.entries(value)) flatten(child, prefix ? prefix + '.' + key : key, out)
  else throw new Error(`${prefix}: messages must be strings or objects`)
  return out
}

function read(locale: string, namespace: string): Map<string, string> {
  return flatten(JSON.parse(fs.readFileSync(path.join(root, locale, namespace + '.json'), 'utf8')))
}

/** Base key → its strings (one, or one per plural category). */
function group(messages: Map<string, string>): Map<string, Map<string, string>> {
  const groups = new Map<string, Map<string, string>>()
  for (const [key, text] of messages) {
    const suffix = PLURAL_SUFFIX.exec(key)?.[1] ?? ''
    const base = suffix ? key.slice(0, -suffix.length - 1) : key
    if (!groups.has(base)) groups.set(base, new Map())
    groups.get(base)!.set(suffix, text)
  }
  return groups
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*([\w.]+)[^}]*\}\}/g)].map(match => match[1]).sort()
const tagsOf = (text: string) => [...text.matchAll(/<\/?(\w+)\s*\/?>/g)].map(match => match[0]).sort()

describe.each(NAMESPACES)('messages/%s', namespace => {
  const source = group(read(DEFAULT_LOCALE, namespace))

  it.each(LOCALES.map(locale => [locale.code, locale.intl] as const))('%s matches the Vietnamese keys, placeholders and plural forms', (code, intl) => {
    const target = group(read(code, namespace))
    expect([...target.keys()].sort()).toEqual([...source.keys()].sort())
    const categories = new Intl.PluralRules(intl).resolvedOptions().pluralCategories
    for (const [base, forms] of source) {
      const translated = target.get(base)!
      const expected = [...new Set([...forms.values()].flatMap(placeholders))]
      for (const [suffix, text] of translated) {
        expect(text.trim(), `${code}/${namespace}:${base}${suffix && '_' + suffix} is empty`).not.toBe('')
        // A plural form may drop {{count}} ("one file"), every other placeholder must survive.
        const got = placeholders(text)
        expect(expected.filter(name => name !== 'count' || !suffix).every(name => got.includes(name)), `${code}/${namespace}:${base} lost a placeholder`).toBe(true)
        expect(got.every(name => expected.includes(name)), `${code}/${namespace}:${base} invents a placeholder`).toBe(true)
        expect(tagsOf(text), `${code}/${namespace}:${base} changed its markup`).toEqual(tagsOf([...forms.values()][0]))
      }
      const counted = [...forms.values()].some(text => placeholders(text).includes('count'))
      if (counted && categories.length > 1) {
        expect([...translated.keys()].sort(), `${code}/${namespace}:${base} needs every plural form`).toEqual([...categories].sort())
      }
    }
  })
})
