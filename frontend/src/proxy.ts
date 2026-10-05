import { NextResponse, type NextRequest } from 'next/server'
import { BASE_PATH, withBase } from '@/utils/url'
import { ROUTES } from '@/constants/routes'
import { legacyToolPath } from '@/features/tools/hub/utils/tool-lookup'

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
  return NextResponse.next()
}

export const config = { matcher: ['/', '/doc-tools/:path*'] }
