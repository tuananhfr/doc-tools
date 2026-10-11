import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'

export function sandboxMetadata(id: 'numerology' | 'playing-cards' | 'tarot', slug: string) {
  return async ({ params }: LangParams): Promise<Metadata> => {
    const locale = await pageLocale(params); const t = await getServerT(locale, 'catalog')
    return { title: t(`tools.${id}.name`), description: t(`tools.${id}.description`), alternates: localeAlternates('/' + slug, locale), robots: { index: false, follow: false } }
  }
}
