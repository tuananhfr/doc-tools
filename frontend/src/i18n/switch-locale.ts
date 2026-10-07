import { SERVICE_WORKER_SCOPE, withBase } from '@/utils/url'
import { LOCALE_COOKIE, localizePath, type Locale } from './locales'

/** Href of the same page in another language; `routerPath` is the locale-free React Router pathname. */
export function localeHref(routerPath: string, locale: Locale): string {
  return withBase(localizePath(routerPath, locale))
}

/**
 * Full page load on purpose: `<html lang dir>`, the RTL stylesheet and the boot
 * messages come from the server layout, which client-side routing never re-renders.
 */
export function switchLocale(href: string, locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=${SERVICE_WORKER_SCOPE}; max-age=31536000; samesite=lax`
  window.location.assign(href + window.location.search + window.location.hash)
}
