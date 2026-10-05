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
    alternates: { canonical: '/' + tool.slug },
    openGraph: { title: toolPageTitle(tool), description: tool.description, url: '/' + tool.slug },
    twitter: { card: 'summary', title: toolPageTitle(tool), description: tool.description },
  }
}
export default async function ToolRoute({ params }: Props) {
  const { tool: slug } = await params
  const { tool, redirect: canonical } = resolveToolRoute(slug)
  if (!tool) redirect('/')
  if (canonical) redirect('/' + canonical)
  return null
}
