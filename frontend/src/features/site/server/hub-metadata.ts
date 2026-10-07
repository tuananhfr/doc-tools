import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'
import type { HubPageSlug } from '../types/hub-page.types'

export function hubMetadata(slug: HubPageSlug) {
  return async function generateMetadata({ params }: LangParams): Promise<Metadata> {
    const locale = await pageLocale(params)
    const t = await getServerT(locale, 'site')
    const title = t(`hubs.${slug}.metaTitle`)
    const description = t(`hubs.${slug}.metaDescription`)
    const alternates = localeAlternates('/' + slug, locale)
    return {
      title,
      description,
      alternates,
      openGraph: { title, description, url: alternates.canonical },
    }
  }
}
