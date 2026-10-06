import type { Metadata } from 'next'
import { withBase } from '@/utils/url'
import { findGuide, GUIDES } from '@/features/site/config/guides'
import { guideTitle } from '@/features/site/utils/guide'

type Props = { params: Promise<{ guide: string }> }

export function generateStaticParams() { return GUIDES.map(guide => ({ guide: guide.slug })) }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const guide = findGuide((await params).guide)
  if (!guide) return { robots: { index: false, follow: true } }
  const title = guideTitle(guide)
  const url = withBase('/huong-dan/' + guide.slug)
  return { title, description: guide.summary, alternates: { canonical: url }, openGraph: { title, description: guide.summary, url, type: 'article' } }
}

// Slug lạ: GuidePage tự chuyển về /huong-dan phía client. Không dùng redirect() ở đây:
// lần render động đầu tiên Next 16 trả HAI header Location, Chrome gộp thành URL hỏng.
export default function GuideRoute() { return null }
