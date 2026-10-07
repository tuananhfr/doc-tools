import type { Metadata } from 'next'
import { DEFAULT_LOCALE } from '@/i18n/locales'
import { ADMIN_SECTIONS } from '@/features/admin'

// Vietnamese only, and the proxy sends `/<lang>/quan-tri` back here. Every parent call names `lang`
// itself: Next 16 drops the whole route from the build when any parent call returns `[]`.
export function generateStaticParams() {
  return ADMIN_SECTIONS.map(section => ({ lang: DEFAULT_LOCALE, path: section.slug ? [section.slug] : [] }))
}

export const metadata: Metadata = { title: 'Quản trị Chuyện Nhỏ', robots: { index: false, follow: false } }

export default function AdminRoute() { return null }
