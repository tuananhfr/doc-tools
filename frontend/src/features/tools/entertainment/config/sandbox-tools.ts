import type { ToolEntry, ToolDefinition } from '../../hub/types/tool.types'

export const ENTERTAINMENT_IDS = ['numerology', 'playing-cards', 'tarot', 'lunar-calendar'] as const
export function sandboxTools<T extends ToolEntry | ToolDefinition>(tools: readonly T[], enabled: boolean): T[] {
  return tools.map(tool => enabled && tool.status === 'soon' && tool.sandboxScreen ? { ...tool, status: 'ready', screen: tool.sandboxScreen } as T : tool)
}
