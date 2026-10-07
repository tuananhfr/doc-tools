import type { Metadata } from 'next'
import { findGuide, GUIDES } from '@/features/site/config/guides'
import { guideText } from '@/features/site/utils/guide'
import { getServerT, localeAlternates, pageLocale } from '@/i18n/server'

type Props = { params: Promise<{ lang: string; guide: string }> }

export function generateStaticParams() { return GUIDES.map(guide => ({ guide: guide.slug })) }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = findGuide((await params).guide)
  if (!guide) return { robots: { index: false, follow: true } }
  const locale = await pageLocale(params)
  const text = guideText(await getServerT(locale, 'guides'), guide.slug)
  const title = (await getServerT(locale, 'site'))('guide.metaTitle', { title: text.title })
  const alternates = localeAlternates('/huong-dan/' + guide.slug, locale)
  return { title, description: text.summary, alternates, openGraph: { title, description: text.summary, url: alternates.canonical, type: 'article' } }
}

// Slug lạ: GuidePage tự chuyển về /huong-dan phía client. Không dùng redirect() ở đây:
// lần render động đầu tiên Next 16 trả HAI header Location, Chrome gộp thành URL hỏng.
export default function GuideRoute() { return null }
