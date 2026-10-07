import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { useToolsBranch } from '@/features/tools/hub/hooks/tools-branch'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { toolPath } from '@/features/tools/hub/utils/tool-lookup'
import { ProcessingBadge } from './ProcessingBadge'

/** Thẻ "Sắp có" không phải link: slug của nó chỉ đưa về trang chủ. */
export function HubToolCard({ tool }: { tool: ToolDefinition }) {
  const { t } = useTranslation('site')
  const { base } = useToolsBranch()
  const ready = tool.status === 'ready'

  return (
    <article className={`cn-hub-card${ready ? '' : ' is-soon'}`}>
      <div className="cn-hub-card-head">
        <span className="cn-hub-card-icon"><Icon name={tool.icon} /></span>
        <div>
          <h3>{tool.name}</h3>
          <p>{tool.description}</p>
        </div>
      </div>
      <ProcessingBadge tool={tool} />
      {ready ? (
        <Link className="cn-hub-card-cta" to={toolPath(base, tool)}>
          <span className="visually-hidden">{tool.name}: </span>{t('toolCard.useNow')} <Icon name="arrow-right" />
        </Link>
      ) : (
        <span className="cn-hub-card-cta is-disabled"><Icon name="clock" />{t('toolCard.soon')}</span>
      )}
    </article>
  )
}
