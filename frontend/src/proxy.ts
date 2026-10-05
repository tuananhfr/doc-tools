import { NextResponse, type NextRequest } from 'next/server'
import { ROUTES } from '@/constants/routes'
import { legacyToolPath } from '@/features/tools/hub/utils/tool-lookup'

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const legacy = url.searchParams.get('tool')
  const oldPath = url.pathname === '/doc-tools' || url.pathname.startsWith('/doc-tools/')

  if (oldPath) url.pathname = url.pathname.slice('/doc-tools'.length) || ROUTES.docTools
  if (url.pathname === ROUTES.docTools && legacy !== null) {
    url.pathname = legacyToolPath(ROUTES.docTools, legacy)
    url.searchParams.delete('tool')
    return NextResponse.redirect(url, oldPath ? 308 : 307)
  }
  if (oldPath) return NextResponse.redirect(url, 308)
  return NextResponse.next()
}

export const config = { matcher: ['/', '/doc-tools/:path*'] }
