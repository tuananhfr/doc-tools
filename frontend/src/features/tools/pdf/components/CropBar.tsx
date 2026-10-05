import { Button, Spinner } from 'react-bootstrap'
import { Icon } from '@/components/ui'
import type { Rect } from '../types/markup.types'
import { MIN_CROP } from '../services/page-edit'

const MM_PER_PT = 25.4 / 72

interface CropBarProps {
  rect: Rect | null
  busy: boolean
  onApply: () => void
  onCancel: () => void
}

export function CropBar({ rect, busy, onApply, onCancel }: CropBarProps) {
  const usable = !!rect && rect.width >= MIN_CROP && rect.height >= MIN_CROP
  return (
    <div className="erp-doc-markbar erp-doc-cropbar" role="toolbar" aria-label="Cắt trang">
      <p className="erp-doc-markbar__notice" aria-live="polite">
        <Icon name="crop" />
        {usable
          ? `Giữ lại ${Math.round(rect.width * MM_PER_PT)} × ${Math.round(rect.height * MM_PER_PT)} mm — kéo trong khung để dời.`
          : 'Kéo trên trang để chọn phần giữ lại.'}
      </p>
      <div className="erp-doc-markbar__actions erp-doc-cropbar__actions">
        <Button size="sm" variant="outline-secondary" disabled={busy} onClick={onCancel}>
          Huỷ
        </Button>
        <Button size="sm" variant="primary" disabled={!usable || busy} onClick={onApply}>
          {busy ? <Spinner size="sm" as="span" className="me-2" /> : <Icon name="check2" className="me-2" />}
          Cắt trang
        </Button>
      </div>
    </div>
  )
}
