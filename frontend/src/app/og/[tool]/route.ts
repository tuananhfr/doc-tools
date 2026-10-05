import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { resolveToolRoute } from '@/features/tools/hub/utils/tool-lookup'
import { createToolShareImage } from '@/features/site/server/tool-share-image'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const dynamicParams = false
export const revalidate = 86400

export function generateStaticParams() {
  return TOOL_CATALOG.filter(tool => tool.status === 'ready').map(tool => ({ tool: tool.slug }))
}

export async function GET(_request: Request, { params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params
  const { tool } = resolveToolRoute(slug)
  if (!tool) return new Response('Tool not found', { status: 404 })
  return createToolShareImage(tool)
}
