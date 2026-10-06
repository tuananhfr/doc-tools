import { Icon } from '@/components/ui/Icon'
import type { ToolDefinition } from '@/features/tools/hub/types/tool.types'
import { toolProcessing } from '@/features/tools/hub/utils/tool-registry'

/** Nơi tệp được xử lý. Nhãn phải đúng với `processing` của danh mục, vì đó là lời hứa với người dùng. */
export function ProcessingBadge({ tool }: { tool: ToolDefinition }) {
  if (toolProcessing(tool) === 'server') {
    return <span className="cn-processing cn-processing--server"><Icon name="cloud-arrow-up" />Xử lý trên máy chủ</span>
  }
  return <span className="cn-processing cn-processing--device"><Icon name="check-circle-fill" />Trên thiết bị</span>
}
