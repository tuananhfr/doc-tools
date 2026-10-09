import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import type { LandingTool, LandingToolItem } from '../types/landing.types'

/** Staff may leave a card's text empty: the tool's own catalog name and description fill it in. */
export function pickLandingTools(items: readonly LandingToolItem[], catalog: readonly ToolDefinition[]): LandingTool[] {
  return items.flatMap(item => {
    const tool = catalog.find(entry => entry.slug === item.slug && entry.status === 'ready')
    // A tool retired after publishing drops out instead of linking to a dead page.
    return tool ? [{ slug: tool.slug, icon: tool.icon, title: item.title || tool.name, body: item.body || tool.description }] : []
  })
}
