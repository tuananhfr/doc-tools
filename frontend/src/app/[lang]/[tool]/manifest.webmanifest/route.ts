import { buildToolWebManifest } from '@/features/site/server/web-manifest'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { LOCALE_CODES, isLocale } from '@/i18n/locales'

export const dynamic = 'force-static'
export const dynamicParams = false

type Params = { params: Promise<{ lang: string; tool: string }> }

// Kể cả `vi`: URL `/vi/<slug>/manifest.webmanifest` có đuôi tệp nên proxy không redirect về bản không tiền tố.
// Next có thể truyền `lang` từ `[lang]/layout.tsx` xuống; không có thì tự trải đủ mọi ngôn ngữ.
export function generateStaticParams({ params }: { params: { lang?: string } }) {
  const langs = params.lang ? [params.lang] : LOCALE_CODES
  return langs.flatMap(lang => TOOL_CATALOG.filter(tool => tool.status === 'ready').map(tool => ({ lang, tool: tool.slug })))
}

export async function GET(_request: Request, { params }: Params) {
  const { lang, tool: slug } = await params
  if (!isLocale(lang)) return new Response('Not found', { status: 404 })
  const manifest = await buildToolWebManifest(slug, lang)
  if (!manifest) return new Response('Not found', { status: 404 })
  return Response.json(manifest, { headers: { 'Content-Type': 'application/manifest+json' } })
}
