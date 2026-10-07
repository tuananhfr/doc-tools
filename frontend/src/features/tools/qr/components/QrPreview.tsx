import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { QR_BACKGROUND } from '../config/qr-colors'
import type { QrMatrix } from '../types/qr.types'
import { matrixPath, matrixSpan } from '../utils/qr-matrix'

interface QrPreviewProps {
  /** null = chưa có mã để vẽ. */
  matrix: QrMatrix | null
  color: string
  background?: string | null
  /** Lời nhắn khi chưa có mã ("Nhập nội dung để tạo mã"). */
  placeholder: string
}

/** The checkerboard is only a preview aid and never enters exported files. */
export function QrPreview({ matrix, color, background = QR_BACKGROUND, placeholder }: QrPreviewProps) {
  const { t } = useTranslation('qr')
  if (!matrix) {
    return (
      <div className="erp-qr-preview erp-qr-preview--empty">
        <Icon name="qr-code" className="erp-qr-preview__icon" />
        <p className="erp-qr-preview__hint">{placeholder}</p>
      </div>
    )
  }

  const span = matrixSpan(matrix)

  return (
    <div className={`erp-qr-preview${background === null ? ' erp-qr-preview--transparent' : ''}`}>
      <svg className="erp-qr-preview__code" viewBox={`0 0 ${span} ${span}`} shapeRendering="crispEdges" role="img" aria-label={t('qrCreate.previewLabel')}>
        {background !== null ? <rect width={span} height={span} fill={background} /> : null}
        <path d={matrixPath(matrix)} fill={color} />
      </svg>
    </div>
  )
}
