import { withBase } from '@/utils/url'
import type { MetadataRoute } from 'next'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { appConfig } from '@/config/app.config'
export default function sitemap(): MetadataRoute.Sitemap {
  const root = appConfig.siteUrl.replace(/[/]+$/, '')
  return [{ url: root + withBase('/') }, { url: root + withBase('/cong-cu') }, ...TOOL_CATALOG.filter(tool => tool.status === 'ready').map(tool => ({ url: root + withBase('/' + tool.slug) }))]
}
