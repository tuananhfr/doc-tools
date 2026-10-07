import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Icon, StateView } from '@/components/ui'

interface ToolUnsupportedProps {
  toolName: string
  /** Trang chọn công cụ của nhánh đang đứng — lối ra duy nhất. */
  hubPath: string
}

/**
 * Hiện THAY cho màn công cụ khi trình duyệt không chạy nổi pdf.js.
 *
 * Không vẽ màn rồi để nó hỏng: chunk của các công cụ PDF ném lỗi ngay lúc nạp
 * trên trình duyệt cũ, và người dùng chỉ thấy "Đang tải..." mãi.
 */
export function ToolUnsupported({ toolName, hubPath }: ToolUnsupportedProps) {
  const { t } = useTranslation('common')
  return (
    <StateView
      icon="exclamation-triangle"
      tone="warning"
      title={t('unsupported.title')}
      description={t('unsupported.description', { tool: toolName })}
      actions={
        <Link className="btn btn-secondary" to={hubPath}>
          <Icon name="arrow-left" />
          {t('unsupported.back')}
        </Link>
      }
    />
  )
}
