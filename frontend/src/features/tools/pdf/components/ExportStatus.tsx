import { Button, ProgressBar } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { ExportKind, ExportProgress } from '../hooks/useDocExport'

const LABEL: Record<ExportKind, string> = {
  pdf: 'Đang dựng PDF',
  split: 'Đang tách PDF',
  image: 'Đang xuất ảnh',
  word: 'Đang chuyển sang Word',
  excel: 'Đang chuyển sang Excel',
  batch: 'Đang xử lý từng tệp',
}

interface ExportStatusProps {
  busy: ExportKind
  progress: ExportProgress | null
  onCancel: () => void
}

/** Tiến độ + nút Huỷ của một lượt xuất dài (500 trang ảnh, bản vẽ A0…). */
export function ExportStatus({ busy, progress, onCancel }: ExportStatusProps) {
  const percent = progress && progress.total > 0 ? (progress.done / progress.total) * 100 : 0
  // Phần trăm, không "trang x/N": xuất ảnh có trang trí đi hai lượt nên đơn vị không phải số trang.
  const detail = progress && progress.total > 0 ? ` — ${Math.floor(percent)}%` : '…'

  return (
    <div className="erp-doc-export__status" role="status">
      <span className="erp-doc-export__status-text">
        {LABEL[busy]}
        {detail}
      </span>
      <ProgressBar now={percent} aria-label="Tiến độ xuất" className="erp-doc-export__status-bar" />
      <Button variant="outline-secondary" onClick={onCancel}>
        <Icon name="x-circle" className="me-2" />
        Huỷ
      </Button>
    </div>
  )
}
