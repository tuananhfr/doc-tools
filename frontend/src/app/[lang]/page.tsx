import { siteSocialMetadata } from '@/features/site/server/site-social-metadata'
import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getServerT(locale, 'site')
  const title = t('directory.metaTitle')
  const description = t('directory.metaDescription')
  const alternates = localeAlternates('/', locale)
  return {
    title,
    description,
    alternates,
    ...siteSocialMetadata(title, description, alternates.canonical),
  }
}

export default function DirectoryRoute() { return null }
