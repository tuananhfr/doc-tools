import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'
export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const locale = await pageLocale(params)
  const title = (await getServerT(locale, 'site'))('home.metaTitle')
  const alternates = localeAlternates('/', locale)
  return { title, alternates, openGraph: { title, url: alternates.canonical } }
}
export default function HubRoute() { return null }
