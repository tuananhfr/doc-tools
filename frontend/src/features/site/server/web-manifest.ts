import type { MetadataRoute } from 'next'
import { withBase } from '@/utils/url'
import { localeInfo, localizePath, type Locale } from '@/i18n/locales'
import { getServerT } from '@/i18n/server'
import { resolveToolRoute } from '@/features/tools/hub/utils/tool-lookup'
import { siteManifestPath, toolIconPath } from '../config/tool-app'
import { loadToolCatalog } from './tool-catalog'

/** Vietnamese keeps the root `/manifest.webmanifest` it was installed with; other languages get their own copy. */
export function webManifestPath(locale: Locale): string {
  return siteManifestPath(locale)
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
      { src: withBase('/icons/icon-192-20261103.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: withBase('/icons/icon-512-20261103.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: withBase('/icons/icon-maskable-512-20261103.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}

/**
 * Manifest của MỘT công cụ: cài từ trang công cụ thì ra icon riêng trên màn hình chính, bấm là vào thẳng
 * công cụ đó. `id` khác app chung ("/") nên là một ứng dụng khác; chung `id` giữa các ngôn ngữ như app chung.
 * `scope` là đường dẫn công cụ: bấm sang công cụ khác thì mở ra trình duyệt, không lẫn vào cửa sổ công cụ.
 */
export async function buildToolWebManifest(slug: string, locale: Locale): Promise<MetadataRoute.Manifest | null> {
  const { tool, redirect } = resolveToolRoute(slug, await loadToolCatalog(locale))
  if (!tool || redirect) return null
  const { tag, dir } = localeInfo(locale)
  const path = withBase(localizePath('/' + tool.slug, locale))
  return {
    id: withBase('/' + tool.slug),
    name: tool.name,
    short_name: tool.name,
    description: tool.description,
    lang: tag,
    dir,
    start_url: path,
    scope: path,
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#005be8',
    icons: [
      { src: toolIconPath(tool.slug, 'icon-96'), sizes: '96x96', type: 'image/png', purpose: 'any' },
      { src: toolIconPath(tool.slug, 'icon-192'), sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: toolIconPath(tool.slug, 'icon-512'), sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: toolIconPath(tool.slug, 'maskable-512'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
