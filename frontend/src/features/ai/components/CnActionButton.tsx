import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToolCatalog } from '@/features/tools/hub/hooks/useToolCatalog'
import type { OpenToolAction } from '../types/ai.types'

/** Draws only for a tool that is live in this build; a made-up or switched-off slug shows nothing. */
export function CnActionButton({ action }: { action: OpenToolAction }) {
  const { t } = useTranslation('ai')
  const tool = useToolCatalog().find((entry) => entry.slug === action.slug && entry.status === 'ready')
  if (!tool) return null
  const query = new URLSearchParams(action.params).toString()
  return (
    <Link className="cn-ai-action" to={`/${tool.slug}${query ? `?${query}` : ''}`}>
      <span className="cn-ai-action__icon"><Icon name={tool.icon} /></span>
      <span className="cn-ai-action__name">{t('chat.openTool', { name: tool.name })}</span>
      <Icon name="arrow-right" />
    </Link>
  )
}
