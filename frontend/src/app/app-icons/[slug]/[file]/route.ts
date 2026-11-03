import { TOOL_CATALOG } from '@/features/tools/hub/config/tool-catalog'
import { resolveToolRoute } from '@/features/tools/hub/utils/tool-lookup'
import { TOOL_ICON_VARIANTS, isToolIconVariant, toolIconFile, TOOL_ICON_VERSION } from '@/features/site/config/tool-app'
import { toolAppIconPng } from '@/features/site/server/tool-app-icon'

export const runtime = 'nodejs'
export const dynamic = 'force-static'
export const dynamicParams = false

type Params = { params: Promise<{ slug: string; file: string }> }

/** Vẽ sẵn lúc build: mọi công cụ đang chạy × mọi biến thể của phiên bản icon hiện tại. */
export function generateStaticParams() {
  const files = (Object.keys(TOOL_ICON_VARIANTS) as (keyof typeof TOOL_ICON_VARIANTS)[]).map(toolIconFile)
  return TOOL_CATALOG.filter(tool => tool.status === 'ready').flatMap(tool => files.map(file => ({ slug: tool.slug, file })))
}

export async function GET(_request: Request, { params }: Params) {
  const { slug, file } = await params
  const { tool, redirect } = resolveToolRoute(slug)
  const variant = file.replace(new RegExp(`-${TOOL_ICON_VERSION}\\.png$`), '')
  if (!tool || redirect || !file.endsWith(`-${TOOL_ICON_VERSION}.png`) || !isToolIconVariant(variant)) return new Response('Not found', { status: 404 })
  return new Response(new Uint8Array(await toolAppIconPng(tool, variant)), {
    // URL có phiên bản: đổi hình là đổi URL, nên cache lâu được.
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=31536000, immutable' },
  })
}
