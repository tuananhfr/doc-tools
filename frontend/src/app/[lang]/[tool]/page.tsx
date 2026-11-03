import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { loadToolCatalog } from '@/features/site/server/tool-catalog'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { resolveToolRoute, toolPageTitle } from '@/features/tools/hub/utils/tool-lookup'
import { localizePath } from '@/i18n/locales'
import { localeAlternates, pageLocale } from '@/i18n/server'
import { toolShareImagePath } from '@/features/site/server/share-image-locale'
import { SITE_FAVICON } from '@/features/site/config/brand-assets'
import { toolIconPath, toolManifestPath } from '@/features/site/config/tool-app'
import { withBase } from '@/utils/url'
type Props = { params: Promise<{ lang: string; tool: string }> }
export function generateStaticParams() { return TOOL_CATALOG.filter(tool => tool.status === 'ready').map(tool => ({ tool: tool.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool: slug } = await params
  const locale = await pageLocale(params)
  const { tool } = resolveToolRoute(slug, await loadToolCatalog(locale))
  if (!tool) return { robots: { index: false, follow: true } }
  const alternates = localeAlternates('/' + tool.slug, locale)
  const shareImage = toolShareImagePath(tool.slug, locale)
  return { title: toolPageTitle(tool), description: tool.description,
    alternates,
    // "Thêm vào màn hình chính" ở trang này ra icon và tên của công cụ, mở thẳng công cụ (không phải app chung).
    manifest: toolManifestPath(tool.slug, locale),
    icons: { icon: [{ url: withBase(SITE_FAVICON), sizes: '32x32', type: 'image/png' }, { url: withBase('/brand/chuyen-nho-favicon-16-20261102.png'), sizes: '16x16', type: 'image/png' }], apple: toolIconPath(tool.slug, 'apple-180') },
    appleWebApp: { capable: true, title: tool.name, statusBarStyle: 'default' },
    openGraph: {
      title: toolPageTitle(tool), description: tool.description, url: alternates.canonical,
      images: [{ url: shareImage, width: 1200, height: 630, type: 'image/png', alt: tool.name + ' — Chuyện Nhỏ' }],
    },
    twitter: {
      card: 'summary_large_image', title: toolPageTitle(tool), description: tool.description,
      images: [{ url: shareImage, alt: tool.name + ' — Chuyện Nhỏ' }],
    },
  }
}
export default async function ToolRoute({ params }: Props) {
  const { tool: slug } = await params
  const locale = await pageLocale(params)
  const { tool, redirect: canonical } = resolveToolRoute(slug)
  if (!tool) redirect(localizePath('/', locale))
  if (canonical) redirect(localizePath('/' + canonical, locale))
  return null
}
