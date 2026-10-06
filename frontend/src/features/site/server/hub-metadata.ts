import type { Metadata } from 'next'
import { withBase } from '@/utils/url'
import { HUB_PAGES } from '../config/hub-pages'
import type { HubPageSlug } from '../types/hub-page.types'

export function hubMetadata(slug: HubPageSlug): Metadata {
  const page = HUB_PAGES[slug]
  const url = withBase('/' + slug)
  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: { canonical: url },
    openGraph: { title: page.metaTitle, description: page.metaDescription, url },
  }
}
