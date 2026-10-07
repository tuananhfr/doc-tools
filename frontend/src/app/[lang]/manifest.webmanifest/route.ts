import { buildWebManifest } from '@/features/site/server/web-manifest'
import { DEFAULT_LOCALE, LOCALE_CODES, isLocale } from '@/i18n/locales'

export const dynamic = 'force-static'
export const dynamicParams = false

// The default locale is served at the root by `app/manifest.webmanifest/route.ts`.
export function generateStaticParams() {
  return LOCALE_CODES.filter(lang => lang !== DEFAULT_LOCALE).map(lang => ({ lang }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLocale(lang)) return new Response('Not found', { status: 404 })
  return Response.json(await buildWebManifest(lang), { headers: { 'Content-Type': 'application/manifest+json' } })
}
