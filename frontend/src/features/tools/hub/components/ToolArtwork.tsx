import { Icon } from '@/components/ui'
import { withBase } from '@/utils/url'
import { TOOL_ARTWORK_SYMBOLS } from '../config/tool-artwork-symbols'
import { toolArtworkStyle } from '../config/tool-artwork'
import type { ToolDefinition } from '../types/tool.types'
import { ToolIllustration } from './ToolIllustration'

function ArtworkSymbol({ name }: { name: string }) {
  return TOOL_ARTWORK_SYMBOLS.has(name)
    ? <svg viewBox="0 0 16 16" className="cn-tool-symbol" aria-hidden="true" focusable="false"><use href={`${withBase('/tool-icons/symbols.svg')}#${name}`} /></svg>
    : <Icon name={name} />
}

/** Shared, sharp pictograms for catalog cards, category pages and tool banners. */
export function ToolArtwork({ tool, small = false }: { tool: Pick<ToolDefinition, 'id' | 'icon' | 'categories'>; small?: boolean }) {
  const art = toolArtworkStyle(tool)
  return <span data-tool-artwork={tool.id} className={`cn-tool-artwork cn-tool-artwork--${art.tone}${art.illustrated ? ' cn-tool-artwork--illustrated' : ''}${small ? ' cn-tool-artwork--sm' : ''}`} aria-hidden="true">
    {art.glyph ? <ToolIllustration glyph={art.glyph} label={art.illustrated && art.glyph === 'calendar' ? 'bare' : art.label} /> : <ArtworkSymbol name={art.symbol ?? tool.icon} />}
    {art.badge ? <span className="cn-tool-artwork-badge"><ArtworkSymbol name={art.badge} /></span> : null}
  </span>
}
