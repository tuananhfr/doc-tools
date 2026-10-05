import type { Decorations } from '../types/decorations.types'
import type { ResolvedDecorations } from '../utils/decorations'
import { HeaderFooterSection } from './HeaderFooterSection'
import { WatermarkSection } from './WatermarkSection'

interface DecorationPanelProps {
  decorations: Decorations
  errors: ResolvedDecorations['errors']
  onChange: (decorations: Decorations, mergeKey?: string) => void
}

export function DecorationPanel({ decorations, errors, onChange }: DecorationPanelProps) {
  return (
    <div>
      <HeaderFooterSection
        value={decorations.headerFooter}
        scopeError={errors.headerFooter}
        onChange={(headerFooter, key) => onChange({ ...decorations, headerFooter }, key)}
      />
      <WatermarkSection
        value={decorations.watermark}
        scopeError={errors.watermark}
        onChange={(watermark, key) => onChange({ ...decorations, watermark }, key)}
      />
    </div>
  )
}
