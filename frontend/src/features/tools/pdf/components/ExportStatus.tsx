import { Button, ProgressBar } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import type { ExportKind, ExportProgress } from '../hooks/useDocExport'

interface ExportStatusProps {
  busy: ExportKind
  progress: ExportProgress | null
  onCancel: () => void
}

/** Tiến độ + nút Huỷ của một lượt xuất dài (500 trang ảnh, bản vẽ A0…). */
export function ExportStatus({ busy, progress, onCancel }: ExportStatusProps) {
  const { t } = useTranslation('pdf')
  const percent = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0
  // Phần trăm, không "trang x/N": xuất ảnh có trang trí đi hai lượt nên đơn vị không phải số trang.
  const detail = progress && progress.total > 0 ? ` — ${Math.floor(percent)}%` : '…'

  return (
    <div className="erp-doc-export__status" role="status">
      <span className="erp-doc-export__status-text">
        {t(`exportStatus.${busy}`)}
        {detail}
      </span>
      <ProgressBar now={percent} aria-label={t('exportStatus.progress')} className="erp-doc-export__status-bar" />
      <Button variant="outline-secondary" onClick={onCancel}>
        <Icon name="x-circle" className="me-2" />
        {t('shared.cancel')}
      </Button>
    </div>
  )
}
