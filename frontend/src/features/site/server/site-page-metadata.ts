import type { Metadata } from 'next'
import { withBase } from '@/utils/url'
import { SITE_PAGE_META, type SitePageSlug } from '../config/site-pages'

export function sitePageMetadata(slug: SitePageSlug): Metadata {
  const { title, description } = SITE_PAGE_META[slug]
  const url = withBase('/' + slug)
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url } }
}
