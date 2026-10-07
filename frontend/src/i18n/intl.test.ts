import type { i18n } from 'i18next'
import { describe, expect, it } from 'vitest'
import { createI18n } from './instance'
import { intlLocale, intlTagOf, numberFormat, speechLanguage } from './intl'
import { loadResources } from './resources'

// The probe key exists only at runtime, so it is outside the typed key union.
const probe = (instance: i18n) => (options: object) => (instance.t as unknown as (key: string, o: object) => string)('pdf:probe', options)

describe('intl helpers', () => {
  it('follows the active page locale (tests run in Vietnamese)', () => {
    expect(intlLocale()).toBe('vi-VN')
    expect(numberFormat().format(1234567.5)).toBe('1.234.567,5')
  })

  it('keeps Latin digits for Arabic and drops Unicode extensions for speech APIs', () => {
    expect(numberFormat(undefined, intlTagOf('ar')).format(1234)).toMatch(/^1.?234$/)
    expect(intlTagOf('ar').split('-u-')[0]).toBe('ar')
    expect(speechLanguage()).toBe('vi-VN')
  })

  it('formats {{value, num}} per locale inside messages', async () => {
    const en = createI18n('en', await loadResources('en', ['common', 'catalog', 'pdf']))
    en.addResource('en', 'pdf', 'probe', '{{count, num}} chars')
    expect(probe(en)({ count: 12345 })).toBe('12,345 chars')
    const ar = createI18n('ar', await loadResources('ar', ['common', 'catalog', 'pdf']))
    ar.addResource('ar', 'pdf', 'probe', '{{count, num}}')
    expect(probe(ar)({ count: 12345 })).not.toMatch(/[٠-٩]/)
  })
})
