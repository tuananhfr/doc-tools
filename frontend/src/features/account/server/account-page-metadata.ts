import type { Metadata } from 'next'
import { getServerT, pageLocale, type LangParams } from '@/i18n/server'
import type { AccountPageSlug } from '@/features/site/config/site-pages'

/** Personal pages: nothing for a search engine to index, links may still be followed. */
export function accountPageMetadata(slug: AccountPageSlug) {
  return async function generateMetadata({ params }: LangParams): Promise<Metadata> {
    const t = await getServerT(await pageLocale(params), 'account')
    return { title: t(`pages.${slug}.title`), description: t(`pages.${slug}.description`), robots: { index: false, follow: true } }
  }
}
