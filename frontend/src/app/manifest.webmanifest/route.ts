import { buildWebManifest } from '@/features/site/server/web-manifest'
import { DEFAULT_LOCALE } from '@/i18n/locales'

export const dynamic = 'force-static'

// A route rather than `app/manifest.ts`: that file convention overrides `metadata.manifest`, so every language would link this one.
export async function GET() {
  return Response.json(await buildWebManifest(DEFAULT_LOCALE), { headers: { 'Content-Type': 'application/manifest+json' } })
}
