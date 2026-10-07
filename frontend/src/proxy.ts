import { NextResponse, type NextRequest } from 'next/server'
import { BASE_PATH, withBase } from '@/utils/url'
import { ROUTES } from '@/constants/routes'
import { legacyToolPath } from '@/features/tools/hub/utils/tool-lookup'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localizePath, splitLocalePath } from '@/i18n/locales'

export function proxy(request: NextRequest) {
  const url = new URL(request.url)
  url.pathname = request.nextUrl.pathname
  const legacy = url.searchParams.get('tool')
  const oldPath = !BASE_PATH && (url.pathname === '/doc-tools' || url.pathname.startsWith('/doc-tools/'))

  if (oldPath) url.pathname = url.pathname.slice('/doc-tools'.length) || ROUTES.docTools
  if (url.pathname === ROUTES.docTools && legacy !== null) {
    url.pathname = legacyToolPath(ROUTES.docTools, legacy)
    url.searchParams.delete('tool')
    url.pathname = withBase(url.pathname)
    return NextResponse.redirect(url, oldPath ? 308 : 307)
  }
  if (oldPath) return NextResponse.redirect(url, 308)
  if (BASE_PATH && url.pathname === '/' && new URL(request.url).pathname === BASE_PATH) {
    url.pathname = BASE_PATH + '/'
    return NextResponse.redirect(url, 308)
  }
  return localeRoute(request, url)
}

/**
 * Every page is prerendered under `app/[lang]`, but the default locale is served
 * without a prefix: `/cong-cu` is rewritten to `/vi/cong-cu`, and `/vi/cong-cu`
 * redirects back so each page has a single URL.
 */
function localeRoute(request: NextRequest, url: URL) {
  const { locale, rest, explicit } = splitLocalePath(url.pathname)
  if (explicit) {
    if (locale !== DEFAULT_LOCALE) return NextResponse.next()
    url.pathname = withBase(rest)
    return NextResponse.redirect(url, 308)
  }
  // Only a language the visitor picked; Accept-Language is ignored so crawlers always get the default page.
  // Top-level navigations only: the service worker precaches unprefixed URLs and must not store a redirect.
  const remembered = request.cookies.get(LOCALE_COOKIE)?.value
  if (isLocale(remembered) && remembered !== DEFAULT_LOCALE && request.headers.get('sec-fetch-mode') === 'navigate') {
    url.pathname = withBase(localizePath(rest, remembered))
    return NextResponse.redirect(url, 307)
  }
  const target = new URL(request.url)
  target.pathname = withBase('/' + DEFAULT_LOCALE + (rest === '/' ? '' : rest))
  return NextResponse.rewrite(target)
}

// Pages only: Next internals, the API rewrite, share images, vendored engines and any file with an extension pass through.
export const config = { matcher: ['/((?!_next|__next|api/|og/|vendor/|.*\\.\\w+$).*)'] }
