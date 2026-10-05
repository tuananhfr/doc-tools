import { Button, ProgressBar } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { FlowProgress as Progress } from '../../types/flow.types'

interface FlowProgressProps {
  progress: Progress | null
  onCancel: () => void
}

/** Tiến độ + nút Huỷ của lượt đang chạy. */
export function FlowProgress({ progress, onCancel }: FlowProgressProps) {
  const percent = progress && progress.total > 0 ? Math.min(100, (progress.done / progress.total) * 100) : 0
  const known = !!progress && progress.total > 0
  // Tiến độ đếm theo trang, mà sau trang cuối còn nén ảnh / gói .zip — có khi lâu hơn cả phần
  // trước. Đứng im ở "100%" trông như treo, nên nói rõ là đang làm nốt.
  const finishing = known && percent >= 100

  return (
    <div className="erp-flow-progress" role="status">
      <span className="erp-flow-progress__text">
        {finishing ? 'Đang hoàn tất…' : `${progress?.label ?? 'Đang xử lý'}${known ? ` — ${Math.floor(percent)}%` : '…'}`}
      </span>
      <ProgressBar now={known ? percent : 100} animated={!known || finishing} aria-label="Tiến độ xử lý" className="erp-flow-progress__bar" />
      <Button variant="outline-secondary" className="erp-flow-progress__cancel" onClick={onCancel}>
        <Icon name="x-circle" className="me-2" />
        Huỷ
      </Button>
    </div>
  )
}
