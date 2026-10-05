import { withBase } from '@/utils/url'
import type { MetadataRoute } from 'next'
import { appConfig } from '@/config/app.config'
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: withBase('/'), disallow: withBase('/api/') }, sitemap: appConfig.siteUrl.replace(/[/]+$/, '') + withBase('/sitemap.xml') }
}
