import type { MetadataRoute } from 'next'
import { withBase } from '@/utils/url'
import { DEFAULT_LOCALE, localeInfo, localizePath, type Locale } from '@/i18n/locales'
import { getServerT } from '@/i18n/server'

/** Vietnamese keeps the root `/manifest.webmanifest` it was installed with; other languages get their own copy. */
export function webManifestPath(locale: Locale): string {
  return withBase(locale === DEFAULT_LOCALE ? '/manifest.webmanifest' : `/${locale}/manifest.webmanifest`)
}

/** Without a manifest the browser offers no "Install" / "Add to Home screen". */
export async function buildWebManifest(locale: Locale): Promise<MetadataRoute.Manifest> {
  const t = await getServerT(locale, 'site')
  const { tag, dir } = localeInfo(locale)
  return {
    // One id and scope for every language, so installing from another language updates the same app instead of adding a second one.
    id: withBase('/'),
    name: t('meta.title'),
    short_name: 'Chuyện Nhỏ',
    description: t('meta.description'),
    lang: tag,
    dir,
    start_url: withBase(localizePath('/', locale)),
    scope: withBase('/'),
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#005be8',
    icons: [
      { src: withBase('/icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: withBase('/icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: withBase('/icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
