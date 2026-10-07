import type { CSSProperties, ReactNode } from 'react'
import { Spinner } from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { Icon } from '@/components/ui'
import { usePagePreview } from '../../hooks/usePagePreview'
import { PDF_CSS_SCALE } from '../../services/page-preview'
import type { PageRef, SourceFile } from '../../types/doc-tools.types'
import type { Size } from '../../utils/page-geometry'
import type { Box } from '../../utils/preview-zoom'

interface PageCanvasProps {
  source: SourceFile
  page: PageRef
  /** Lớp phủ đặt theo khổ trang nhìn thấy (pt). */
  overlay?: (size: Size) => ReactNode
}

/** Khung vẽ: đủ nét cho cột chính rộng nhất (~860px) mà trang A4 không tốn quá ~2 triệu điểm ảnh. */
const FRAME: Box = { width: 900, height: 1200 }

/**
 * Một trang vẽ nét trong vùng làm việc của công cụ nhanh, khung mang ĐÚNG tỉ lệ
 * trang — lớp phủ đặt theo phần trăm của khung nên lệch tỉ lệ là lệch mọi toạ độ.
 */
export function PageCanvas({ source, page, overlay }: PageCanvasProps) {
  const { t } = useTranslation('pdf')
  const { host, size: shown, status } = usePagePreview(source, page, 'page', FRAME)
  const size = shown ? { width: shown.width / PDF_CSS_SCALE, height: shown.height / PDF_CSS_SCALE } : null

  return (
    <div className="erp-page-stage__frame" style={{ '--erp-page-ratio': size ? size.width / size.height : 0.707 } as CSSProperties}>
      <div ref={host} className="erp-page-stage__canvas" aria-hidden />
      {status === 'error' ? (
        <p className="erp-page-stage__status" role="alert">
          <Icon name="exclamation-triangle" />
          {t('stage.drawFailed')}
        </p>
      ) : status === 'loading' ? (
        <p className="erp-page-stage__status" role="status">
          <Spinner as="span" size="sm" />
          {t('stage.drawing')}
        </p>
      ) : size ? (
        overlay?.(size)
      ) : null}
    </div>
  )
}
