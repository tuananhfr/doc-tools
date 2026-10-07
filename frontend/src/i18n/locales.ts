export interface LocaleInfo {
  /** URL segment, lowercase. */
  code: string
  /** BCP 47 tag for `<html lang>` and hreflang. */
  tag: string
  /** Native name shown in the language picker. */
  label: string
  dir: 'ltr' | 'rtl'
  /** Locale handed to `Intl` formatters. */
  intl: string
}

export const LOCALES = [
  { code: 'vi', tag: 'vi', label: 'Tiếng Việt', dir: 'ltr', intl: 'vi-VN' },
  { code: 'en', tag: 'en', label: 'English', dir: 'ltr', intl: 'en-US' },
  { code: 'fr', tag: 'fr', label: 'Français', dir: 'ltr', intl: 'fr-FR' },
  { code: 'ja', tag: 'ja', label: '日本語', dir: 'ltr', intl: 'ja-JP' },
  { code: 'ko', tag: 'ko', label: '한국어', dir: 'ltr', intl: 'ko-KR' },
  { code: 'zh-hans', tag: 'zh-Hans', label: '简体中文', dir: 'ltr', intl: 'zh-CN' },
  { code: 'zh-hant', tag: 'zh-Hant', label: '繁體中文', dir: 'ltr', intl: 'zh-TW' },
  { code: 'th', tag: 'th', label: 'ไทย', dir: 'ltr', intl: 'th-TH' },
  { code: 'id', tag: 'id', label: 'Bahasa Indonesia', dir: 'ltr', intl: 'id-ID' },
  { code: 'ms', tag: 'ms', label: 'Bahasa Melayu', dir: 'ltr', intl: 'ms-MY' },
  { code: 'fil', tag: 'fil', label: 'Filipino', dir: 'ltr', intl: 'fil-PH' },
  { code: 'km', tag: 'km', label: 'ខ្មែរ', dir: 'ltr', intl: 'km-KH' },
  { code: 'lo', tag: 'lo', label: 'ລາວ', dir: 'ltr', intl: 'lo-LA' },
  { code: 'my', tag: 'my', label: 'မြန်မာ', dir: 'ltr', intl: 'my-MM' },
  // Latin digits: tool inputs and outputs (sizes, page numbers) are typed and copied as ASCII.
  { code: 'ar', tag: 'ar', label: 'العربية', dir: 'rtl', intl: 'ar-u-nu-latn' },
] as const satisfies readonly LocaleInfo[]

export type Locale = (typeof LOCALES)[number]['code']

/** Served without a URL prefix so links published before i18n keep working. */
export const DEFAULT_LOCALE: Locale = 'vi'
export const LOCALE_CODES: readonly Locale[] = LOCALES.map(locale => locale.code)
export const LOCALE_COOKIE = 'cn_locale'

const BY_CODE = new Map<string, LocaleInfo>(LOCALES.map(locale => [locale.code, locale]))

export function isLocale(value: string | null | undefined): value is Locale {
  return value != null && BY_CODE.has(value)
}

export function localeInfo(locale: Locale): LocaleInfo {
  return BY_CODE.get(locale)!
}

/** URL prefix for a locale, without trailing slash: `''` for the default locale, `/en` otherwise. */
export function localePrefix(locale: Locale): string {
  return locale === DEFAULT_LOCALE ? '' : '/' + locale
}

/** Splits a base-less pathname into its locale and the locale-free rest (`/en/cong-cu` → `en`, `/cong-cu`). */
export function splitLocalePath(pathname: string): { locale: Locale; rest: string; explicit: boolean } {
  const match = /^\/([^/]+)(\/.*)?$/.exec(pathname)
  if (match && isLocale(match[1])) return { locale: match[1], rest: match[2] || '/', explicit: true }
  return { locale: DEFAULT_LOCALE, rest: pathname || '/', explicit: false }
}

/** Base-less path of `path` (locale-free, starting with `/`) in `locale`. */
export function localizePath(path: string, locale: Locale): string {
  const prefix = localePrefix(locale)
  if (!prefix) return path
  return path === '/' ? prefix : prefix + path
}
