import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui/Icon'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { toolProcessing } from '@/features/tools/hub/utils/tool-registry'

/** Nơi tệp được xử lý. Nhãn phải đúng với `processing` của danh mục, vì đó là lời hứa với người dùng. */
export function ProcessingBadge({ tool }: { tool: ToolDefinition }) {
  const { t } = useTranslation('site')
  if (toolProcessing(tool) === 'server') {
    return <span className="cn-processing cn-processing--server"><Icon name="cloud-arrow-up" />{t('processing.server')}</span>
  }
  return <span className="cn-processing cn-processing--device"><Icon name="check-circle-fill" />{t('processing.device')}</span>
}
