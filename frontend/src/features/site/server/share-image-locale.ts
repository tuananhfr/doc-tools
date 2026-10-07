import { withBase } from '@/utils/url'
import { DEFAULT_LOCALE, type Locale } from '@/i18n/locales'

// Satori cannot shape these scripts (Arabic crashes its bidi pass; Thai, Lao, Khmer and Myanmar lose mark placement and reordering).
const UNSHAPEABLE: ReadonlySet<Locale> = new Set<Locale>(['ar', 'th', 'lo', 'km', 'my'])

/** Language the share card is drawn in: the page's own, or English where Satori would garble the script. */
export function shareImageLocale(locale: Locale): Locale {
  return UNSHAPEABLE.has(locale) ? 'en' : locale
}

/** Vietnamese keeps the original `/og/<tool>` URL that social platforms have already cached. */
export function toolShareImagePath(slug: string, locale: Locale): string {
  const imageLocale = shareImageLocale(locale)
  return withBase(imageLocale === DEFAULT_LOCALE ? `/og/${slug}` : `/og/${slug}/${imageLocale}`)
}
