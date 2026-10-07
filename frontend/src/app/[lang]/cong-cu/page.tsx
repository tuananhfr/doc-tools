import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getServerT(locale, 'site')
  const title = t('directory.metaTitle')
  const alternates = localeAlternates('/cong-cu', locale)
  return {
    title,
    description: t('directory.metaDescription'),
    alternates,
    openGraph: { title, url: alternates.canonical },
  }
}

export default function DirectoryRoute() { return null }
