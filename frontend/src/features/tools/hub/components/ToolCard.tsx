import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui'
import { useToolsBranch } from '../hooks/tools-branch'
import type { ToolDefinition } from '../types/tool.types'
import { toolPath } from '../utils/tool-lookup'
import { ToolTile } from './ToolTile'

/**
 * Thẻ một công cụ. Công cụ chưa làm KHÔNG phải link: thẻ vẫn có mặt để người
 * dùng biết nó sẽ có, nhưng bấm vào một trang trống thì tệ hơn không bấm được.
 */
export function ToolCard({ tool }: { tool: ToolDefinition }) {
  const { base } = useToolsBranch()
  const { t } = useTranslation('common')
  const body = (
    <>
      <ToolTile tool={tool} />
      <span className="erp-tool-card__text">
        <span className="erp-tool-card__name">{tool.name}</span>
        <span className="erp-tool-card__desc">{tool.description}</span>
      </span>
    </>
  )

  if (tool.status === 'soon') {
    return (
      <div className="erp-tool-card is-soon">
        {body}
        <span className="erp-tool-card__soon">
          <Icon name="clock" />
          {t('toolCard.soon')}
        </span>
      </div>
    )
  }

  return (
    <Link className="erp-tool-card" to={toolPath(base, tool)}>
      {body}
      <Icon name="chevron-right" className="erp-tool-card__go" />
    </Link>
  )
}
