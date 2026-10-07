import type { i18n } from 'i18next'
import { DEFAULT_LOCALE, isLocale, localeInfo } from './locales'
import { peekActiveLanguage } from './runtime'

/** Intl tag for an i18next language code (`ar` → `ar-u-nu-latn` keeps Latin digits). */
export function intlTagOf(language: string): string {
  return localeInfo(isLocale(language) ? language : DEFAULT_LOCALE).intl
}

/**
 * Intl tag of the page being viewed. Formatting runs in the browser (tool screens, data fetched after
 * hydration); server code has no page locale and gets the default one rather than a crash.
 */
export function intlLocale(): string {
  return intlTagOf(peekActiveLanguage() ?? DEFAULT_LOCALE)
}

/** BCP 47 tag for speech APIs, which reject Unicode extensions such as `-u-nu-latn`. */
export function speechLanguage(): string {
  return intlLocale().split('-u-')[0]
}

const numberFormats = new Map<string, Intl.NumberFormat>()
const dateFormats = new Map<string, Intl.DateTimeFormat>()

function cached<T>(cache: Map<string, T>, tag: string, options: object | undefined, create: () => T): T {
  const key = `${tag}|${options ? JSON.stringify(options) : ''}`
  let value = cache.get(key)
  if (!value) {
    value = create()
    cache.set(key, value)
  }
  return value
}

/** Cached `Intl.NumberFormat` for the page locale (building one costs far more than formatting). */
export function numberFormat(options?: Intl.NumberFormatOptions, tag = intlLocale()): Intl.NumberFormat {
  return cached(numberFormats, tag, options, () => new Intl.NumberFormat(tag, options))
}

/** Cached `Intl.DateTimeFormat` for the page locale. */
export function dateTimeFormat(options?: Intl.DateTimeFormatOptions, tag = intlLocale()): Intl.DateTimeFormat {
  return cached(dateFormats, tag, options, () => new Intl.DateTimeFormat(tag, options))
}

/** `{{value, num}}` in messages: grouping per locale, never Arabic-Indic digits. */
export function registerFormatters(instance: i18n): void {
  instance.services.formatter?.add('num', (value, language) => numberFormat(undefined, intlTagOf(language ?? DEFAULT_LOCALE)).format(Number(value)))
}
