import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'
import type { SitePageSlug } from '../config/site-pages'

export function sitePageMetadata(slug: SitePageSlug) {
  return async function generateMetadata({ params }: LangParams): Promise<Metadata> {
    const locale = await pageLocale(params)
    const t = await getServerT(locale, 'site')
    const title = t(`pages.${slug}.title`)
    const description = t(`pages.${slug}.description`)
    const alternates = localeAlternates('/' + slug, locale)
    return { title, description, alternates, openGraph: { title, description, url: alternates.canonical } }
  }
}
