import { siteSocialMetadata } from '@/features/site/server/site-social-metadata'
import { SITE_FAVICON, SITE_APPLE_ICON } from '@/features/site/config/brand-assets'
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
    icons: { icon: [{ url: withBase(SITE_FAVICON), sizes: '32x32', type: 'image/png' }, { url: withBase('/brand/chuyen-nho-favicon-16-20261102.png'), sizes: '16x16', type: 'image/png' }], apple: withBase(SITE_APPLE_ICON) },
    alternates,
    ...siteSocialMetadata(title, description, alternates.canonical),
  }
}

export default function LandingRoute() { return null }
