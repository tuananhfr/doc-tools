import { Icon } from '@/components/ui'
import { QR_BACKGROUND } from '../config/qr-colors'
import type { QrMatrix } from '../types/qr.types'
import { matrixPath, matrixSpan } from '../utils/qr-matrix'

interface QrPreviewProps {
  /** null = chưa có mã để vẽ. */
  matrix: QrMatrix | null
  color: string
  /** Lời nhắn khi chưa có mã ("Nhập nội dung để tạo mã"). */
  placeholder: string
}

/** Mã QR đang soạn, vẽ bằng SVG trên ô nền trắng ở cả ba theme. */
export function QrPreview({ matrix, color, placeholder }: QrPreviewProps) {
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
    <div className="erp-qr-preview">
      <svg className="erp-qr-preview__code" viewBox={`0 0 ${span} ${span}`} shapeRendering="crispEdges" role="img" aria-label="Mã QR của nội dung đang nhập">
        <rect width={span} height={span} fill={QR_BACKGROUND} />
        <path d={matrixPath(matrix)} fill={color} />
      </svg>
    </div>
  )
}
