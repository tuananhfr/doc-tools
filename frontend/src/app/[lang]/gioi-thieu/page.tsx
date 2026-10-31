import { SITE_FAVICON } from '@/features/site/config/brand-assets'
import type { Metadata } from 'next'
import { getServerT, localeAlternates, pageLocale, type LangParams } from '@/i18n/server'
import { withBase } from '@/utils/url'

export async function generateMetadata({ params }: LangParams): Promise<Metadata> {
  const locale = await pageLocale(params)
  const t = await getServerT(locale, 'site')
  const title = t('landing.metaTitle')
  const description = t('landing.metaDescription')
  const alternates = localeAlternates('/gioi-thieu', locale)
  return {
    title,
    description,
    icons: { icon: [{ url: withBase(SITE_FAVICON), sizes: '32x32', type: 'image/png' }, { url: withBase('/brand/chuyen-nho-favicon-16-20261031.png'), sizes: '16x16', type: 'image/png' }], apple: withBase('/icons/apple-touch-icon-20261031.png') },
    alternates,
    openGraph: { title, description, url: alternates.canonical, type: 'website', images: [{ url: withBase('/landing/hero.webp'), width: 1672, height: 941, alt: 'Chuyện Nhỏ' }] },
    twitter: { card: 'summary_large_image', title, description, images: [withBase('/landing/hero.webp')] },
  }
}

export default function LandingRoute() { return null }
