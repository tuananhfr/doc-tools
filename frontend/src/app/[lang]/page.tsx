import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'
import { withBase } from '@/utils/url'

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getServerT(locale, 'site')
  const title = t('landing.metaTitle')
  const description = t('landing.metaDescription')
  const alternates = localeAlternates('/', locale)
  return {
    title,
    description,
    icons: { icon: withBase('/landing/icon.png'), apple: withBase('/icons/apple-touch-icon.png') },
    alternates,
    openGraph: { title, description, url: alternates.canonical, type: 'website', images: [{ url: withBase('/landing/hero.webp'), width: 1672, height: 941, alt: 'Chuyện Nhỏ' }] },
    twitter: { card: 'summary_large_image', title, description, images: [withBase('/landing/hero.webp')] },
  }
}

export default function LandingRoute() { return null }
