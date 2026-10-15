import { ToolArtwork } from './ToolArtwork'
import type { ToolDefinition } from '../types/tool.types'
import { toolTone } from '../utils/tool-lookup'

/** Ô icon màu của một công cụ — màu theo nhóm, đổi trong CSS (`erp-tool-tile--<tone>`). */
export function ToolTile({ tool, small = false }: { tool: ToolDefinition; small?: boolean }) {
  return (
    <span className={`erp-tool-tile erp-tool-tile--${toolTone(tool)}${small ? ' erp-tool-tile--sm' : ''}`}>
      <ToolArtwork tool={tool} />
    </span>
  )
}
