import { withBase } from '@/utils/url'
import type { MetadataRoute } from 'next'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { appConfig } from '@/config/app.config'
import { SITE_PAGE_SLUGS } from '@/features/site/config/site-pages'
import { GUIDES } from '@/features/site/config/guides'
export default function sitemap(): MetadataRoute.Sitemap {
  const root = appConfig.siteUrl.replace(/[/]+$/, '')
  return [{ url: root + withBase('/') }, ...SITE_PAGE_SLUGS.map(slug => ({ url: root + withBase('/' + slug) })), ...GUIDES.map(guide => ({ url: root + withBase('/huong-dan/' + guide.slug) })), ...TOOL_CATALOG.filter(tool => tool.status === 'ready').map(tool => ({ url: root + withBase('/' + tool.slug) }))]
}
