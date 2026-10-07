import { resolveToolRoute } from '@/features/tools/hub/utils/tool-lookup'
import { loadToolCatalog } from '@/features/site/server/tool-catalog'
import { shareImageLocale } from '@/features/site/server/share-image-locale'
import { createToolShareImage } from '@/features/site/server/tool-share-image'
import { DEFAULT_LOCALE, isLocale } from '@/i18n/locales'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const revalidate = 86400

// Drawn on first request and then cached: prerendering every tool × language would add hundreds of rarely fetched images to each build.
export function generateStaticParams() {
  return []
}

export async function GET(_request: Request, { params }: { params: Promise<{ tool: string; lang: string }> }) {
  const { tool: slug, lang } = await params
  // The default locale lives at `/og/<tool>`, and unshapeable scripts point at the English card instead.
  if (!isLocale(lang) || lang === DEFAULT_LOCALE || shareImageLocale(lang) !== lang) return new Response('Not found', { status: 404 })
  const { tool } = resolveToolRoute(slug, await loadToolCatalog(lang))
  if (!tool) return new Response('Tool not found', { status: 404 })
  return createToolShareImage(tool, lang)
}
