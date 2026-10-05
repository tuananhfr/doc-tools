import { withBase } from '@/utils/url'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { resolveToolRoute, toolPageTitle } from '@/features/tools/hub/utils/tool-lookup'
type Props = { params: Promise<{ tool: string }> }
export function generateStaticParams() { return TOOL_CATALOG.filter(tool => tool.status === 'ready').map(tool => ({ tool: tool.slug })) }
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool: slug } = await params
  const { tool } = resolveToolRoute(slug)
  if (!tool) return { robots: { index: false, follow: true } }
  return { title: toolPageTitle(tool), description: tool.description,
    alternates: { canonical: withBase('/' + tool.slug) },
    openGraph: {
      title: toolPageTitle(tool), description: tool.description, url: withBase('/' + tool.slug),
      images: [{ url: withBase('/og/' + tool.slug), width: 1200, height: 630, type: 'image/png', alt: tool.name + ' — Chuyện Nhỏ' }],
    },
    twitter: {
      card: 'summary_large_image', title: toolPageTitle(tool), description: tool.description,
      images: [{ url: withBase('/og/' + tool.slug), alt: tool.name + ' — Chuyện Nhỏ' }],
    },
  }
}
export default async function ToolRoute({ params }: Props) {
  const { tool: slug } = await params
  const { tool, redirect: canonical } = resolveToolRoute(slug)
  if (!tool) redirect('/')
  if (canonical) redirect('/' + canonical)
  return null
}
