import { NextResponse, type NextRequest } from 'next/server'
import { legacyToolPath } from '@/features/tools/hub/utils/tool-lookup'

export function proxy(request: NextRequest) {
  const legacy = request.nextUrl.searchParams.get('tool')
  if (legacy === null) return NextResponse.next()
  return NextResponse.redirect(new URL(legacyToolPath('/doc-tools', legacy), request.url))
}
export const config = { matcher: '/doc-tools' }
