import type { MetadataRoute } from 'next'
import { appConfig } from '@/config/app.config'
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', allow: '/', disallow: '/api/' }, sitemap: appConfig.siteUrl.replace(/[/]+$/, '') + '/sitemap.xml' }
}
