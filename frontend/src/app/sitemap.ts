import { withBase } from '@/utils/url'
import type { MetadataRoute } from 'next'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { appConfig } from '@/config/app.config'
import { SITE_PAGE_SLUGS } from '@/features/site/config/site-pages'
import { GUIDES } from '@/features/site/config/guides'
import { LOCALES, localizePath } from '@/i18n/locales'
export default function sitemap(): MetadataRoute.Sitemap {
  const root = appConfig.siteUrl.replace(/[/]+$/, '')
  const paths = ['/', ...SITE_PAGE_SLUGS.map(slug => '/' + slug), ...GUIDES.map(guide => '/huong-dan/' + guide.slug), ...TOOL_CATALOG.filter(tool => tool.status === 'ready').map(tool => '/' + tool.slug)]
  // Every language version is listed and names all the others, as Google expects for hreflang in sitemaps.
  return paths.flatMap(path => {
    const languages = Object.fromEntries(LOCALES.map(locale => [locale.tag, root + withBase(localizePath(path, locale.code))]))
    return LOCALES.map(locale => ({ url: root + withBase(localizePath(path, locale.code)), alternates: { languages } }))
  })
}
